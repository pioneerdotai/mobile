import { useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import type { ClientThreadTreeLevel } from '@/client';
import {
    composerCapabilityTargetForProvider,
    isCliRuntimeProvider,
} from '@/services/providers/cli-runtime';
import { refreshCliRuntimeSummaries } from '@/services/providers/cli-runtime-live';
import { cachedActiveThreadSnapshot } from '@/services/threads/timeline-query';
import {
    refreshThreadTree,
    applyThreadUpdatedToTreeSnapshot,
    threadUnreadById,
    threadTreeInvalidationWorkspaceId,
    threadTreeLevel,
} from '@/services/threads/tree';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useGatewayStore } from '@/stores/gateway';
import { useThreadTreeStore } from '@/stores/thread-tree';
import { useWorkspaceStore } from '@/stores/workspace';
import { mobileStartup } from '@/services/telemetry/mobile-startup';

let refreshSequence = 0;

const EMPTY_LEVEL: ClientThreadTreeLevel = {
    folder_id: null,
    folder: null,
    parent_folder_id: null,
    folder_path: [],
    agents_doc_summary: null,
    folders: [],
    threads: [],
};

const errorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
};

const useThreadTreeRefresh = () => {
    const { t } = useTranslation('threads');
    const queryClient = useQueryClient();
    const { setSnapshot, setLoading, setError, reset } = useThreadTreeStore(
        useShallow((state) => ({
            setSnapshot: state.setSnapshot,
            setLoading: state.setLoading,
            setError: state.setError,
            reset: state.reset,
        })),
    );

    return useCallback(async (): Promise<void> => {
        const gatewayState = useGatewayStore.getState();
        const workspaceState = useWorkspaceStore.getState();
        const currentWorkspaceId = workspaceState.activeWorkspaceId;

        if (gatewayState.connectionState !== 'Connected' || gatewayState.connectionId === null) {
            reset();
            useActiveThreadStore.getState().resetDefaultComposerModelSelection();
            return;
        }

        if (!currentWorkspaceId) {
            reset();
            useActiveThreadStore.getState().resetDefaultComposerModelSelection();
            return;
        }

        const activeThreadState = useActiveThreadStore.getState();
        const activeThreadSnapshot = cachedActiveThreadSnapshot(
            queryClient,
            activeThreadState.activeComposerThreadId,
        );
        const requestConnectionId = gatewayState.connectionId;
        const requestWorkspaceId = currentWorkspaceId;
        const activeThreadWorkspaceId =
            activeThreadSnapshot?.workspace_id ??
            activeThreadSnapshot?.thread?.workspace_id ??
            null;
        const activeThreadMatchesWorkspace = activeThreadWorkspaceId === requestWorkspaceId;
        const sequence = refreshSequence + 1;
        refreshSequence = sequence;

        activeThreadState.beginDefaultComposerModelSelectionRefresh(requestWorkspaceId);
        mobileStartup.begin('thread_tree.load');
        setLoading(true);
        setError(null);

        try {
            const result = await refreshThreadTree({
                workspace_id: requestWorkspaceId,
                active_thread_id: activeThreadMatchesWorkspace
                    ? (activeThreadSnapshot?.thread_id ?? null)
                    : null,
                existing_draft_thread_id: activeThreadMatchesWorkspace
                    ? (activeThreadSnapshot?.draft_thread_id ?? null)
                    : null,
                existing_draft_thread_workspace_id: activeThreadMatchesWorkspace
                    ? (activeThreadSnapshot?.draft_workspace_id ??
                      activeThreadSnapshot?.workspace_id ??
                      null)
                    : null,
                has_known_threads_for_workspace:
                    useThreadTreeStore.getState().workspaceId === requestWorkspaceId,
            });
            mobileStartup.succeed('thread_tree.load');
            mobileStartup.begin('composer.prepare');
            const defaultProvider = result.composer_model_selection?.provider ?? null;
            const cliRuntimes = isCliRuntimeProvider(defaultProvider)
                ? await refreshCliRuntimeSummaries(requestWorkspaceId).catch(() => [])
                : [];
            const capabilityTarget = composerCapabilityTargetForProvider(
                defaultProvider,
                cliRuntimes,
            );
            const latestGatewayState = useGatewayStore.getState();
            const latestWorkspaceState = useWorkspaceStore.getState();

            if (
                refreshSequence !== sequence ||
                latestGatewayState.connectionId !== requestConnectionId ||
                latestGatewayState.connectionState !== 'Connected' ||
                latestWorkspaceState.activeWorkspaceId !== requestWorkspaceId
            ) {
                return;
            }

            setSnapshot(result.snapshot);
            useActiveThreadStore
                .getState()
                .syncDefaultComposerModelSelection(
                    requestWorkspaceId,
                    result.composer_model_selection?.provider ?? null,
                    result.composer_model_selection?.model ?? null,
                    result.composer_model_selection?.selected_reasoning_effort ?? null,
                    capabilityTarget,
                );
            mobileStartup.succeed('composer.prepare');
        } catch (caught) {
            const latestGatewayState = useGatewayStore.getState();
            const latestWorkspaceState = useWorkspaceStore.getState();

            if (
                refreshSequence !== sequence ||
                latestGatewayState.connectionId !== requestConnectionId ||
                latestWorkspaceState.activeWorkspaceId !== requestWorkspaceId
            ) {
                return;
            }

            setError(errorMessage(caught, t('loadFailed')));
            mobileStartup.fail('thread_tree.load');
            mobileStartup.fail('composer.prepare');
            useActiveThreadStore
                .getState()
                .completeDefaultComposerModelSelectionRefresh(requestWorkspaceId);
        } finally {
            const latestGatewayState = useGatewayStore.getState();
            const latestWorkspaceState = useWorkspaceStore.getState();

            if (
                refreshSequence === sequence &&
                latestGatewayState.connectionId === requestConnectionId &&
                latestWorkspaceState.activeWorkspaceId === requestWorkspaceId
            ) {
                setLoading(false);
            }
        }
    }, [queryClient, reset, setError, setLoading, setSnapshot, t]);
};

export const useThreadTreeController = () => {
    const { connectionId, connectionState } = useGatewayStore(
        useShallow((state) => ({
            connectionId: state.connectionId,
            connectionState: state.connectionState,
        })),
    );
    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const reset = useThreadTreeStore((state) => state.reset);
    const refresh = useThreadTreeRefresh();

    useEffect(() => {
        if (connectionState !== 'Connected' || connectionId === null || !activeWorkspaceId) {
            reset();
            return;
        }

        void refresh();
    }, [activeWorkspaceId, connectionId, connectionState, refresh, reset]);

    useEffect(() => {
        return useGatewayStore.subscribe((state, previousState) => {
            if (state.lastEventSerial === previousState.lastEventSerial) return;

            const event = state.lastEvent;
            const currentWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;
            if (
                event &&
                'GatewayNotification' in event &&
                event.GatewayNotification.kind === 'thread_updated'
            ) {
                const notification = event.GatewayNotification.params;
                const tree = useThreadTreeStore.getState();
                if (
                    tree.snapshot &&
                    tree.workspaceId === currentWorkspaceId &&
                    notification.thread.workspace_id === currentWorkspaceId
                ) {
                    tree.setSnapshot(
                        applyThreadUpdatedToTreeSnapshot(
                            tree.snapshot,
                            notification.thread,
                            notification.placement,
                        ),
                    );
                }
                return;
            }

            const eventWorkspaceId = threadTreeInvalidationWorkspaceId(event);

            if (!eventWorkspaceId || eventWorkspaceId !== currentWorkspaceId) return;

            void refresh();
        });
    }, [refresh]);

    return null;
};

export const useThreadTree = () => {
    const { snapshot, workspaceId, loading, error } = useThreadTreeStore(
        useShallow((state) => ({
            snapshot: state.snapshot,
            workspaceId: state.workspaceId,
            loading: state.loading,
            error: state.error,
        })),
    );
    const refresh = useThreadTreeRefresh();

    return {
        snapshot,
        workspaceId,
        loading,
        error,
        refresh,
    };
};

export const useThreadTreeLevel = (folderId: string | null) => {
    const tree = useThreadTree();
    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const snapshotMatchesActiveWorkspace = tree.workspaceId === activeWorkspaceId;
    const level = useMemo(() => {
        if (!tree.snapshot || !snapshotMatchesActiveWorkspace) {
            return EMPTY_LEVEL;
        }

        return threadTreeLevel(tree.snapshot, folderId);
    }, [folderId, snapshotMatchesActiveWorkspace, tree.snapshot]);
    const unreadByThreadId = useMemo(
        () => (snapshotMatchesActiveWorkspace ? threadUnreadById(tree.snapshot) : {}),
        [snapshotMatchesActiveWorkspace, tree.snapshot],
    );

    return {
        ...tree,
        // Keep the initial loader, but do not replace the new Workspace with a
        // loader while its tree is refreshed in the background.
        loading: tree.loading && (tree.workspaceId === null || snapshotMatchesActiveWorkspace),
        currentFolderId: level.folder_id ?? null,
        currentFolder: level.folder ?? null,
        parentFolderId: level.parent_folder_id ?? null,
        folderPath: level.folder_path,
        currentAgentsDocSummary: level.agents_doc_summary ?? null,
        folders: level.folders,
        threads: level.threads,
        unreadByThreadId,
    };
};

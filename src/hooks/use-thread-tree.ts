import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { pioneerClient, type ClientEvent, type ClientThreadTreeLevel } from '@/client';
import {
    composerCapabilityTargetForProvider,
    isCliRuntimeProvider,
} from '@/services/providers/cli-runtime';
import { refreshThreadTree, threadTreeLevel } from '@/services/threads/tree';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useGatewayStore } from '@/stores/gateway';
import { useThreadTreeStore } from '@/stores/thread-tree';
import { useWorkspaceStore } from '@/stores/workspace';

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

const notificationWorkspaceId = (event: ClientEvent | null): string | null => {
    if (!event || !('GatewayNotification' in event)) {
        return null;
    }

    const notification = event.GatewayNotification;

    switch (notification.kind) {
        case 'workspace_changed':
            return notification.params.workspace.id;
        case 'thread_tree_changed':
        case 'thread_agents_doc_changed':
            return notification.params.workspace_id;
        case 'thread_started':
        case 'thread_updated':
            return notification.params.thread.workspace_id;
        case 'thread_closed':
            return notification.params.workspaceId;
        default:
            return null;
    }
};

const useThreadTreeRefresh = () => {
    const { t } = useTranslation('threads');
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
        const requestConnectionId = gatewayState.connectionId;
        const requestWorkspaceId = currentWorkspaceId;
        const sequence = refreshSequence + 1;
        refreshSequence = sequence;

        activeThreadState.beginDefaultComposerModelSelectionRefresh(requestWorkspaceId);
        setLoading(true);
        setError(null);

        try {
            const result = await refreshThreadTree({
                workspace_id: requestWorkspaceId,
                active_thread_id: activeThreadState.snapshot?.thread_id ?? null,
                existing_draft_thread_id: activeThreadState.snapshot?.draft_thread_id ?? null,
                existing_draft_thread_workspace_id:
                    activeThreadState.snapshot?.draft_workspace_id ??
                    activeThreadState.snapshot?.workspace_id ??
                    null,
                has_known_threads_for_workspace:
                    useThreadTreeStore.getState().workspaceId === requestWorkspaceId,
            });
            const defaultProvider = result.composer_model_selection?.provider ?? null;
            const cliRuntimes = isCliRuntimeProvider(defaultProvider)
                ? await pioneerClient
                      .cliRuntimeList({ workspace_id: requestWorkspaceId })
                      .then((response) => response.runtimes)
                      .catch(() => [])
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
    }, [reset, setError, setLoading, setSnapshot, t]);
};

export const useThreadTreeController = () => {
    const { connectionId, connectionState, lastEvent } = useGatewayStore(
        useShallow((state) => ({
            connectionId: state.connectionId,
            connectionState: state.connectionState,
            lastEvent: state.lastEvent,
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
        const eventWorkspaceId = notificationWorkspaceId(lastEvent);

        if (!eventWorkspaceId || eventWorkspaceId !== activeWorkspaceId) {
            return;
        }

        void refresh();
    }, [activeWorkspaceId, lastEvent, refresh]);

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
    const level = useMemo(() => {
        if (!tree.snapshot) {
            return EMPTY_LEVEL;
        }

        return threadTreeLevel(tree.snapshot, folderId);
    }, [folderId, tree.snapshot]);

    return {
        ...tree,
        currentFolderId: level.folder_id ?? null,
        currentFolder: level.folder ?? null,
        parentFolderId: level.parent_folder_id ?? null,
        folderPath: level.folder_path,
        currentAgentsDocSummary: level.agents_doc_summary ?? null,
        folders: level.folders,
        threads: level.threads,
    };
};

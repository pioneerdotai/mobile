import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { ClientThreadTreeLevel } from '@/client';
import { refreshThreadTree, threadUnreadById, threadTreeLevel } from '@/services/threads/tree';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useGatewayStore } from '@/stores/gateway';
import { useThreadTreeStore } from '@/stores/thread-tree';
import { useWorkspaceStore } from '@/stores/workspace';
import { beginStartupTreeLoad } from '@/services/telemetry/mobile-startup-tree';
import { mobileStartup } from '@/services/telemetry/mobile-startup';

const EMPTY_LEVEL: ClientThreadTreeLevel = {
    folder_id: null,
    folder: null,
    parent_folder_id: null,
    folder_path: [],
    agents_doc_summary: null,
    folders: [],
    threads: [],
};

const useThreadTreeRefresh = () =>
    useCallback(async (): Promise<void> => {
        const workspace = useWorkspaceStore.getState().activeWorkspaceId;
        if (!workspace || useGatewayStore.getState().connectionState !== 'Connected') return;
        mobileStartup.begin('thread_tree.load');
        const gateway = useGatewayStore.getState();
        const scope = {
            gatewayId: gateway.connectionGatewayId,
            connectionId: gateway.sessionConnectionGeneration,
            workspaceId: workspace,
        };
        beginStartupTreeLoad(scope);
        try {
            await refreshThreadTree({ workspace_id: workspace });
            useActiveThreadStore.getState().syncComposerModelSelection();
        } catch {
            // A rejected request may have been replaced. The directory's load
            // receipt, observed by startup readiness, owns the terminal result.
        }
    }, []);

export const useThreadTreeController = () => {
    const { connectionId, connectionState } = useGatewayStore(
        useShallow((state) => ({
            connectionId: state.connectionId,
            connectionState: state.connectionState,
        })),
    );
    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const refresh = useThreadTreeRefresh();

    useEffect(() => {
        if (connectionState !== 'Connected' || connectionId === null || !activeWorkspaceId) {
            return;
        }

        void refresh();
    }, [activeWorkspaceId, connectionId, connectionState, refresh]);

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
        runningTaskThreadIds: snapshotMatchesActiveWorkspace
            ? (tree.snapshot?.running_task_thread_ids ?? [])
            : [],
        runningTaskFolderIds: snapshotMatchesActiveWorkspace
            ? (tree.snapshot?.running_task_folder_ids ?? [])
            : [],
        unreadByFolderId: snapshotMatchesActiveWorkspace
            ? (tree.snapshot?.unread_by_folder_id ?? {})
            : {},
    };
};

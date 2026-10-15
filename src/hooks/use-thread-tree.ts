import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { ClientThreadTreeLevel } from '@/client';
import { refreshThreadTree, threadUnreadById, threadTreeLevel } from '@/services/threads/tree';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useGatewayStore } from '@/stores/gateway';
import { useThreadTreeStore } from '@/stores/thread-tree';
import { useWorkspaceStore } from '@/stores/workspace';
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
        mobileStartup.begin('thread_tree.request');
        try {
            await refreshThreadTree({ workspace_id: workspace });
            mobileStartup.succeed('thread_tree.request');
            mobileStartup.begin('thread_tree.response.apply');
            mobileStartup.succeed('thread_tree.response.apply');
            mobileStartup.succeed('thread_tree.load');
            mobileStartup.begin('composer.prepare');
            useActiveThreadStore.getState().syncComposerModelSelection();
            mobileStartup.succeed('composer.prepare');
        } catch {
            mobileStartup.fail('thread_tree.request');
            mobileStartup.fail('thread_tree.load');
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
    };
};

import { create } from 'zustand';

import type { Workspace } from '@/client';
import type { WorkspaceOperationErrorCode } from '@/services/workspace/management';

type WorkspaceStoreState = {
    workspaces: Workspace[];
    activeWorkspaceId: string | null;
    preferredWorkspaceId: string | null;
    loading: boolean;
    error: WorkspaceOperationErrorCode | null;
    bootstrappedConnectionId: number | null;
    showWorkspaceSwitcher: boolean;
    setWorkspaces: (workspaces: Workspace[]) => void;
    setActiveWorkspaceId: (workspaceId: string | null) => void;
    setPreferredWorkspaceId: (workspaceId: string | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: WorkspaceOperationErrorCode | null) => void;
    setBootstrappedConnectionId: (connectionId: number | null) => void;
    setWorkspaceSwitcherOpen: (open: boolean) => void;
    resetConnectionBootstrap: () => void;
};

export const useWorkspaceStore = create<WorkspaceStoreState>((set) => ({
    workspaces: [],
    activeWorkspaceId: null,
    preferredWorkspaceId: null,
    loading: false,
    error: null,
    bootstrappedConnectionId: null,
    showWorkspaceSwitcher: false,

    setWorkspaces: (workspaces) => {
        set({ workspaces });
    },

    setActiveWorkspaceId: (workspaceId) => {
        set({ activeWorkspaceId: workspaceId });
    },

    setPreferredWorkspaceId: (workspaceId) => {
        set({ preferredWorkspaceId: workspaceId });
    },

    setLoading: (loading) => {
        set({ loading });
    },

    setError: (error) => {
        set({ error });
    },

    setBootstrappedConnectionId: (connectionId) => {
        set({ bootstrappedConnectionId: connectionId });
    },

    setWorkspaceSwitcherOpen: (open) => {
        set({ showWorkspaceSwitcher: open });
    },

    resetConnectionBootstrap: () => {
        set({
            workspaces: [],
            activeWorkspaceId: null,
            preferredWorkspaceId: null,
            loading: false,
            error: null,
            bootstrappedConnectionId: null,
        });
    },
}));

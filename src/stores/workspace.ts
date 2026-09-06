import { create } from 'zustand';
import { navigationSnapshot, selectWorkspace, useClientNavigation } from '@/client/navigation';

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

type WorkspacePresentationState = Omit<
    WorkspaceStoreState,
    'activeWorkspaceId' | 'preferredWorkspaceId'
>;
const useWorkspacePresentationStore = create<WorkspacePresentationState>((set) => ({
    workspaces: [],
    loading: false,
    error: null,
    bootstrappedConnectionId: null,
    showWorkspaceSwitcher: false,

    setWorkspaces: (workspaces) => {
        set({ workspaces });
    },

    setActiveWorkspaceId: (workspaceId) => {
        selectWorkspace(workspaceId);
    },

    setPreferredWorkspaceId: (workspaceId) => {
        selectWorkspace(workspaceId);
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
        selectWorkspace(null);
        set({
            workspaces: [],
            loading: false,
            error: null,
            bootstrappedConnectionId: null,
        });
    },
}));

// Selection is a Client publication; this facade preserves workspace presentation callers.
export const useWorkspaceStore = Object.assign(
    <T>(selector: (state: WorkspaceStoreState) => T): T => {
        const navigation = useClientNavigation();
        return useWorkspacePresentationStore((state) =>
            selector({
                ...state,
                activeWorkspaceId: navigation?.workspace_id ?? null,
                preferredWorkspaceId: navigation?.workspace_id ?? null,
            }),
        );
    },
    {
        getState: (): WorkspaceStoreState => ({
            ...useWorkspacePresentationStore.getState(),
            activeWorkspaceId: navigationSnapshot()?.workspace_id ?? null,
            preferredWorkspaceId: navigationSnapshot()?.workspace_id ?? null,
        }),
        setState: (patch: Partial<WorkspaceStoreState>) => {
            const { activeWorkspaceId, preferredWorkspaceId, ...presentation } = patch;
            if (activeWorkspaceId !== undefined) selectWorkspace(activeWorkspaceId);
            else if (preferredWorkspaceId !== undefined) selectWorkspace(preferredWorkspaceId);
            useWorkspacePresentationStore.setState(presentation);
        },
    },
);

import { catalogSnapshot, useWorkspaceCatalog } from '@/client/workspaces';
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
    setActiveWorkspaceId: (workspaceId: string | null) => void;
    setPreferredWorkspaceId: (workspaceId: string | null) => void;
    setWorkspaceSwitcherOpen: (open: boolean) => void;
    resetConnectionBootstrap: () => void;
};

type WorkspacePresentationState = Omit<
    WorkspaceStoreState,
    | 'activeWorkspaceId'
    | 'preferredWorkspaceId'
    | 'workspaces'
    | 'loading'
    | 'error'
    | 'bootstrappedConnectionId'
>;
const emptyWorkspaces: Workspace[] = [];

const useWorkspacePresentationStore = create<WorkspacePresentationState>((set) => ({
    showWorkspaceSwitcher: false,

    setActiveWorkspaceId: (workspaceId) => {
        selectWorkspace(workspaceId);
    },

    setPreferredWorkspaceId: (workspaceId) => {
        selectWorkspace(workspaceId);
    },

    setWorkspaceSwitcherOpen: (open) => {
        set({ showWorkspaceSwitcher: open });
    },

    resetConnectionBootstrap: () => {
        selectWorkspace(null);
    },
}));

// Selection is a Client publication; this facade preserves workspace presentation callers.
export const useWorkspaceStore = Object.assign(
    <T>(selector: (state: WorkspaceStoreState) => T): T => {
        const navigation = useClientNavigation();
        const catalog = useWorkspaceCatalog();
        // Subscribe to stable store snapshots; compose the selected view during render.
        const presentation = useWorkspacePresentationStore();
        return selector({
            ...presentation,
            workspaces: catalog?.workspaces ?? emptyWorkspaces,
            bootstrappedConnectionId: catalog?.bootstrapped_connection_id ?? null,
            error: catalogError(catalog),
            loading: (catalog?.loading || catalog?.action_pending) ?? false,
            activeWorkspaceId: navigation?.workspace_id ?? null,
            preferredWorkspaceId: navigation?.workspace_id ?? null,
        });
    },
    {
        getState: (): WorkspaceStoreState => ({
            ...useWorkspacePresentationStore.getState(),
            workspaces: catalogSnapshot()?.workspaces ?? emptyWorkspaces,
            bootstrappedConnectionId: catalogSnapshot()?.bootstrapped_connection_id ?? null,
            error: catalogError(catalogSnapshot()),
            loading: (catalogSnapshot()?.loading || catalogSnapshot()?.action_pending) ?? false,
            activeWorkspaceId: navigationSnapshot()?.workspace_id ?? null,
            preferredWorkspaceId: navigationSnapshot()?.workspace_id ?? null,
        }),
        setState: (
            patch: Partial<WorkspacePresentationState> & {
                activeWorkspaceId?: string | null;
                preferredWorkspaceId?: string | null;
            },
        ) => {
            const { activeWorkspaceId, preferredWorkspaceId, ...presentation } = patch;
            if (activeWorkspaceId !== undefined) selectWorkspace(activeWorkspaceId);
            else if (preferredWorkspaceId !== undefined) selectWorkspace(preferredWorkspaceId);
            useWorkspacePresentationStore.setState(presentation);
        },
    },
);

const catalogError = (
    catalog: ReturnType<typeof catalogSnapshot>,
): WorkspaceOperationErrorCode | null => {
    if (!catalog?.error) return null;
    switch (catalog.operation) {
        case 'select':
            return 'selectFailed';
        case 'create':
            return 'createFailed';
        case 'rename':
            return 'renameFailed';
        default:
            return 'bootstrapFailed';
    }
};

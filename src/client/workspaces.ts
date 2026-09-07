import { useSyncExternalStore } from 'react';
import { mobileClientBinding } from './mobile-client-binding';
import type { ThreadTreePublication } from './generated/thread_tree_publication';
import type { WorkspaceCatalogPublication } from './generated/workspace_catalog_publication';

export const catalogStore = () =>
    mobileClientBinding.scope({ kind: 'workspace_tree', workspace_id: null });
export const catalogSnapshot = () =>
    (catalogStore().getSnapshot()?.payload as WorkspaceCatalogPublication | null) ?? null;
export const useWorkspaceCatalog = () => {
    const store = catalogStore();
    return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
        ?.payload as WorkspaceCatalogPublication | null;
};
export const directoryStore = (workspaceId: string | null) =>
    mobileClientBinding.scope(
        workspaceId
            ? { kind: 'workspace_tree', workspace_id: workspaceId }
            : { kind: 'navigation' },
    );
export const directorySnapshot = (workspaceId: string | null) =>
    workspaceId
        ? ((directoryStore(workspaceId).getSnapshot()?.payload as ThreadTreePublication | null) ??
          null)
        : null;
export const useWorkspaceDirectory = (workspaceId: string | null) => {
    const store = directoryStore(workspaceId);
    const publication = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return workspaceId ? ((publication?.payload as ThreadTreePublication | null) ?? null) : null;
};
export const drainWorkspacePublications = (workspaceId: string | null) => {
    mobileClientBinding.drain({ kind: 'workspace_tree', workspace_id: null });
    mobileClientBinding.drain({ kind: 'navigation' });
    if (workspaceId)
        mobileClientBinding.drain({ kind: 'workspace_tree', workspace_id: workspaceId });
};

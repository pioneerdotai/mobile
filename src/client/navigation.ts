import { useSyncExternalStore } from 'react';
import { mobileClientBinding, CLIENT_BINDING_SCHEMA_VERSION } from './mobile-client-binding';
import type { ClientNavigationState } from './generated/client_navigation_state';
import type { NavigationIntent } from './generated/navigation_intent';

const scope = { kind: 'navigation' } as const;
export const navigationStore = () => mobileClientBinding.scope(scope);
export const navigationSnapshot = (): Readonly<ClientNavigationState> | null =>
    (navigationStore().getSnapshot()?.payload as ClientNavigationState | null) ?? null;

export const useClientNavigation = () => {
    const store = navigationStore();
    const publication = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return (publication?.payload as Readonly<ClientNavigationState> | null) ?? null;
};

export const dispatchNavigation = (
    intent: NavigationIntent,
    expectedRevision: number | null = null,
) => {
    const transition = mobileClientBinding.dispatch({
        schema_version: CLIENT_BINDING_SCHEMA_VERSION,
        intent: { kind: 'navigation', intent, expected_revision: expectedRevision },
    });
    mobileClientBinding.drain(scope);
    return transition;
};

export const selectWorkspace = (workspaceId: string | null) =>
    dispatchNavigation({ kind: 'select_workspace', workspace_id: workspaceId });

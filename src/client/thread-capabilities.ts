import { useEffect, useSyncExternalStore } from 'react';
import { mobileClientBinding } from './mobile-client-binding';
import type { IdentityAuthorizationPublication } from './generated/identity_authorization_publication';
import type { ThreadCapabilityPublication } from './generated/thread_capability_publication';

export const retryThreadCapabilities = (threadId: string) =>
    mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'thread_capability', intent: { kind: 'retry', thread_id: threadId } },
    });

export const useThreadCapabilities = (
    threadId: string | null,
    visible: boolean,
    workspaceId: string | null,
) => {
    const identityStore = mobileClientBinding.scope({ kind: 'administration', workspace_id: null });
    const identityPublication = useSyncExternalStore(
        identityStore.subscribe,
        identityStore.getSnapshot,
        identityStore.getSnapshot,
    );
    const identity = identityPublication?.payload as IdentityAuthorizationPublication | null;
    const authenticated = identity?.current_auth != null;
    const connection = identity?.connection_generation;
    const authorization = identity?.authorization_change_sequence;
    const store = mobileClientBinding.scope(
        threadId && visible
            ? { kind: 'thread_capability', thread_id: threadId }
            : { kind: 'navigation' },
    );
    const publication = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    useEffect(() => {
        if (!threadId || !visible || !authenticated) return;
        mobileClientBinding.dispatch({
            schema_version: 1,
            intent: { kind: 'thread_capability', intent: { kind: 'observe', thread_id: threadId } },
        });
    }, [threadId, workspaceId, visible, authenticated, connection, authorization]);
    const input =
        threadId && visible ? (publication?.payload as ThreadCapabilityPublication | null) : null;
    return input?.thread_id === threadId && authenticated ? input : null;
};

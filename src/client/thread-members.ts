import { useEffect, useSyncExternalStore } from 'react';
import { mobileClientBinding } from './mobile-client-binding';
import { useThreadCapabilities } from './thread-capabilities';
import type { ThreadMemberIntent } from './generated/client_intent';
import type { ThreadMemberPublication } from './generated/thread_member_publication';
import type { IdentityAuthorizationPublication } from './generated/identity_authorization_publication';

export const dispatchThreadMember = (intent: ThreadMemberIntent): number | null => {
    const result = mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'thread_member', intent },
    });
    const scope = { kind: 'thread_member', thread_id: intent.thread_id } as const;
    mobileClientBinding.drain(scope);
    const publication = mobileClientBinding.scope(scope).getSnapshot()
        ?.payload as ThreadMemberPublication | null;
    return result.outcome === 'changed' ? (publication?.generation ?? null) : null;
};

export const useThreadMembers = (
    threadId: string | null,
    visible: boolean,
    workspaceId: string | null,
) => {
    const capabilities = useThreadCapabilities(threadId, visible, workspaceId);
    const identityStore = mobileClientBinding.scope({ kind: 'administration', workspace_id: null });
    const identityInput = useSyncExternalStore(
        identityStore.subscribe,
        identityStore.getSnapshot,
        identityStore.getSnapshot,
    );
    const identity = identityInput?.payload as IdentityAuthorizationPublication | null;
    const authenticated = identity?.current_auth != null;
    const connection = identity?.connection_generation;
    const authorization = identity?.authorization_change_sequence;
    const capabilityRevision = capabilities?.revision;
    const store = mobileClientBinding.scope(
        threadId && visible
            ? { kind: 'thread_member', thread_id: threadId }
            : { kind: 'navigation' },
    );
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    useEffect(() => {
        if (threadId && visible && authenticated)
            dispatchThreadMember({ kind: 'observe', thread_id: threadId });
    }, [
        threadId,
        workspaceId,
        visible,
        authenticated,
        connection,
        authorization,
        capabilityRevision,
    ]);
    const input =
        threadId && visible ? (snapshot?.payload as ThreadMemberPublication | null) : null;
    return authenticated && input?.thread_id === threadId ? input : null;
};

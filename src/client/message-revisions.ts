import { useMemo, useSyncExternalStore } from 'react';
import type { MessageRevisionIntent } from './generated/client_intent';
import type {
    MessageRevisionIdentity,
    MessageRevisionPublication,
} from './generated/message_revision_publication';
import { mobileClientBinding } from './mobile-client-binding';

const storeFor = (threadId: string) =>
    mobileClientBinding.scope({ kind: 'message_revisions', thread_id: threadId });

export const dispatchMessageRevisions = (intent: MessageRevisionIntent) => {
    const result = mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'message_revisions', intent },
    });
    mobileClientBinding.drain({
        kind: 'message_revisions',
        thread_id: intent.kind === 'open' ? intent.thread_id : intent.identity.thread_id,
    });
    return result;
};

const mountedRevisionsStore = (threadId: string, turnId: string) => {
    const store = storeFor(threadId);
    let identity: MessageRevisionIdentity | null = null;
    return {
        subscribe(listener: () => void) {
            const unsubscribe = store.subscribe(listener);
            const result = dispatchMessageRevisions({
                kind: 'open',
                thread_id: threadId,
                turn_id: turnId,
            });
            const input = store.getSnapshot()?.payload as MessageRevisionPublication | null;
            identity =
                result.outcome === 'changed' && input?.identity.turn_id === turnId
                    ? input.identity
                    : null;
            listener();
            return () => {
                const retiring = identity;
                identity = null;
                unsubscribe();
                if (retiring) dispatchMessageRevisions({ kind: 'close', identity: retiring });
            };
        },
        getSnapshot() {
            const input = store.getSnapshot()?.payload as MessageRevisionPublication | null;
            return identity?.thread_id === threadId &&
                identity.turn_id === turnId &&
                input?.identity.thread_id === threadId &&
                input.identity.turn_id === turnId &&
                input.identity.generation === identity.generation
                ? input
                : null;
        },
    };
};

export const useMessageRevisions = (threadId: string, turnId: string) => {
    const mounted = useMemo(() => mountedRevisionsStore(threadId, turnId), [threadId, turnId]);
    return useSyncExternalStore(mounted.subscribe, mounted.getSnapshot, mounted.getSnapshot);
};

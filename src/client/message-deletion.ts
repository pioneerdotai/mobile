import { useSyncExternalStore } from 'react';
import type { MessageDeletionIntent } from './generated/client_intent';
import type { MessageDeletionPublication } from './generated/message_deletion_publication';
import { mobileClientBinding } from './mobile-client-binding';

const storeFor = (threadId: string) =>
    mobileClientBinding.scope({ kind: 'message_deletion', thread_id: threadId });

export const messageDeletionSnapshot = (threadId: string) =>
    (storeFor(threadId).getSnapshot()?.payload as MessageDeletionPublication | null) ?? null;

export const dispatchMessageDeletion = (intent: MessageDeletionIntent) => {
    const result = mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'message_deletion', intent },
    });
    mobileClientBinding.drain({
        kind: 'message_deletion',
        thread_id: intent.kind === 'begin' ? intent.thread_id : intent.identity.thread_id,
    });
    return result;
};

export const beginMessageDeletion = (threadId: string, turnId: string, revision: number) => {
    const result = dispatchMessageDeletion({
        kind: 'begin',
        thread_id: threadId,
        turn_id: turnId,
        expected_revision: revision,
    });
    return result.outcome === 'changed' ? (messageDeletionSnapshot(threadId)?.plan ?? null) : null;
};

export const useMessageDeletion = (threadId: string) => {
    const store = storeFor(threadId);
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return (snapshot?.payload as MessageDeletionPublication | null) ?? null;
};

import { useSyncExternalStore } from 'react';
import type { TurnCancellationPublication } from './generated/turn_cancellation_publication';
import { mobileClientBinding } from './mobile-client-binding';
const storeFor = (thread: string | null) =>
    mobileClientBinding.scope(
        thread ? { kind: 'turn_cancellation', thread_id: thread } : { kind: 'navigation' },
    );
export const turnCancellationSnapshot = (
    thread: string | null,
): TurnCancellationPublication | null =>
    thread
        ? ((storeFor(thread).getSnapshot()?.payload as TurnCancellationPublication | null) ?? null)
        : null;
export const useTurnCancellationPublication = (
    thread: string | null,
): TurnCancellationPublication | null => {
    const store = storeFor(thread);
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return thread ? ((snapshot?.payload as TurnCancellationPublication | null) ?? null) : null;
};
export const requestTurnCancellation = (threadId: string, reason: string | null) => {
    const result = mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'turn_cancellation', intent: { thread_id: threadId, reason } },
    });
    mobileClientBinding.drain({ kind: 'turn_cancellation', thread_id: threadId });
    mobileClientBinding.drain({ kind: 'thread', thread_id: threadId });
    return result;
};

import { useSyncExternalStore } from 'react';
import type { ClientActiveThreadSnapshot } from '@/client';
import { mobileClientBinding } from '@/client/mobile-client-binding';

export const threadSnapshot = (
    threadId: string | null | undefined,
): ClientActiveThreadSnapshot | null =>
    threadId
        ? ((mobileClientBinding.scope({ kind: 'thread', thread_id: threadId }).getSnapshot()
              ?.payload as ClientActiveThreadSnapshot | null) ?? null)
        : null;

export const useActiveThreadSnapshotQuery = (threadId: string | null) => {
    const store = mobileClientBinding.scope(
        threadId ? { kind: 'thread', thread_id: threadId } : { kind: 'navigation' },
    );
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const data = threadId
        ? ((snapshot?.payload as ClientActiveThreadSnapshot | null) ?? undefined)
        : undefined;
    return { data, isFetching: data?.history_loading ?? false, error: null };
};

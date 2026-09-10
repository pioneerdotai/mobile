import { useCallback, useEffect, useRef } from 'react';
import { mobileClientBinding } from '@/client/mobile-client-binding';
import type { TimelineSnapshot } from '@/client/generated/timeline_snapshot';
import { useThreadPresentation } from './use-thread-presentation';

/** Client owns paging; the shell observes completion for its refresh control. */
export const useThreadTimelineBlocksQuery = ({
    threadId,
    enabled,
}: {
    threadId: string | null;
    enabled: boolean;
}) => {
    const { snapshot } = useThreadPresentation(threadId);
    const initialRequest = useRef<string | null>(null);
    const pending = useRef(new Set<() => void>());
    const refetch = useCallback(async () => {
        if (!threadId || !enabled) return;
        const store = mobileClientBinding.scope({ kind: 'timeline', thread_id: threadId });
        const before = store.getSnapshot()?.revisions.scoped ?? 0;
        await new Promise<void>((resolve) => {
            let unsubscribe = () => {};
            const finish = () => {
                unsubscribe();
                pending.current.delete(finish);
                resolve();
            };
            let sawLoading = false;
            const receive = () => {
                const publication = store.getSnapshot();
                const value = publication?.payload as TimelineSnapshot | null;
                if (value && typeof value.status === 'object' && 'Loading' in value.status)
                    sawLoading = true;
                const complete =
                    value?.status === 'Ready' ||
                    (value && typeof value.status === 'object' && 'Failed' in value.status) ||
                    (sawLoading && value?.status === 'Idle');
                if (!value || (publication!.revisions.scoped > before && complete)) finish();
            };
            pending.current.add(finish);
            unsubscribe = store.subscribe(receive);
            try {
                const transition = mobileClientBinding.dispatch({
                    schema_version: 1,
                    intent: { kind: 'refresh_timeline', thread_id: threadId },
                });
                if (transition.outcome === 'rejected' || transition.outcome === 'stale') finish();
            } catch {
                finish();
            }
        });
    }, [threadId, enabled]);
    useEffect(() => {
        if (enabled && threadId && initialRequest.current !== threadId) {
            initialRequest.current = threadId;
            if (!snapshot?.has_loaded_page) void refetch();
        }
    }, [enabled, threadId, snapshot?.has_loaded_page, refetch]);
    useEffect(() => {
        const waits = pending.current;
        return () => {
            for (const finish of [...waits]) finish();
        };
    }, [threadId]);
    const status = snapshot?.status;
    const error =
        status && typeof status === 'object' && 'Failed' in status
            ? new Error(status.Failed.message)
            : null;
    const isLoading =
        !snapshot?.has_loaded_page &&
        (!status || status === 'Idle' || (typeof status === 'object' && 'Loading' in status));
    return { refetch, error, isLoading, hasLoadedPage: snapshot?.has_loaded_page ?? false };
};

import { describe, expect, it, jest } from '@jest/globals';
import { QueryClient, type Query, type QueryKey } from '@tanstack/react-query';

import { PioneerClientNativeError, type ClientActiveThreadSnapshot } from '@/client';

import {
    TIMELINE_FFI_ERROR_CODES,
    cacheActiveThreadSnapshot,
    cachedActiveThreadSnapshot,
    cancelTimelineQueriesExceptThread,
    cancelTimelineQueriesForThread,
    clearThreadQueryCache,
    invalidateThreadTimelinePages,
    invalidateTimelineQueriesForThread,
    invalidateTurnWorkQueries,
    removeTimelineQueriesForThread,
    timelineQueryKeyThreadId,
    timelineQueryKeys,
    timelineQueryRetry,
    timelineQueryRetryDelay,
} from './timeline-query';

jest.mock('@/client', () => ({
    PioneerClientNativeError: class PioneerClientNativeError extends Error {
        code: string | null;

        constructor(message: string, code: string | null = null) {
            super(message);
            this.code = code;
        }
    },
}));

const query = (queryKey: QueryKey): Query => ({ queryKey }) as Query;

const activeThreadSnapshot = (threadId: string, revision: number): ClientActiveThreadSnapshot =>
    ({
        thread_id: threadId,
        projection: { revision },
    }) as unknown as ClientActiveThreadSnapshot;

describe('mobile timeline query orchestration', () => {
    it('keeps independent parent and child snapshots in the React Query cache', () => {
        const queryClient = new QueryClient();
        const parent = activeThreadSnapshot('parent', 2);
        const updatedParent = activeThreadSnapshot('parent', 3);
        const child = activeThreadSnapshot('child', 1);

        cacheActiveThreadSnapshot(queryClient, parent);
        cacheActiveThreadSnapshot(queryClient, child);
        cacheActiveThreadSnapshot(queryClient, updatedParent);

        expect(cachedActiveThreadSnapshot(queryClient, 'parent')).toEqual(updatedParent);
        expect(cachedActiveThreadSnapshot(queryClient, 'child')).toBe(child);
    });

    it('does not replace a live snapshot with an older background refresh', () => {
        const queryClient = new QueryClient();
        const live = activeThreadSnapshot('parent', 4);
        const staleRefresh = activeThreadSnapshot('parent', 3);
        const freshRefresh = activeThreadSnapshot('parent', 5);

        cacheActiveThreadSnapshot(queryClient, live);
        cacheActiveThreadSnapshot(queryClient, staleRefresh);
        expect(cachedActiveThreadSnapshot(queryClient, 'parent')).toBe(live);

        cacheActiveThreadSnapshot(queryClient, freshRefresh);
        expect(cachedActiveThreadSnapshot(queryClient, 'parent')).toEqual(freshRefresh);
    });

    it('clears all thread snapshots together with semantic pages on session cleanup', async () => {
        const queryClient = new QueryClient();
        cacheActiveThreadSnapshot(queryClient, activeThreadSnapshot('parent', 1));
        queryClient.setQueryData(timelineQueryKeys.threadPages('parent'), ['page']);

        await clearThreadQueryCache(queryClient);

        expect(cachedActiveThreadSnapshot(queryClient, 'parent')).toBeNull();
        expect(queryClient.getQueryData(timelineQueryKeys.threadPages('parent'))).toBeUndefined();
    });

    it('keeps turn work page keys stable across live work metadata updates', () => {
        const threadKey = timelineQueryKeys.threadPages('thread_a');
        const workKey = timelineQueryKeys.turnWorkPages('thread_a', 'turn_a');
        const updatedWorkKey = timelineQueryKeys.turnWorkPages('thread_a', 'turn_a');

        expect(timelineQueryKeyThreadId(threadKey)).toBe('thread_a');
        expect(timelineQueryKeyThreadId(workKey)).toBe('thread_a');
        expect(workKey).toContainEqual(
            expect.objectContaining({
                direction: 'turnWork',
                threadId: 'thread_a',
                turnId: 'turn_a',
            }),
        );
        expect(updatedWorkKey).toEqual(workKey);
    });

    it('cancels stale timeline requests on thread switch by predicate', async () => {
        const queryClient = new QueryClient();
        const cancelSpy = jest.spyOn(queryClient, 'cancelQueries').mockResolvedValue(undefined);

        await cancelTimelineQueriesExceptThread(queryClient, 'thread_a');

        const filter = cancelSpy.mock.calls[0]?.[0];
        expect(filter?.predicate?.(query(timelineQueryKeys.threadPages('thread_b')))).toBe(true);
        expect(
            filter?.predicate?.(query(timelineQueryKeys.turnWorkPages('thread_b', 'turn_b'))),
        ).toBe(true);
        expect(filter?.predicate?.(query(timelineQueryKeys.threadPages('thread_a')))).toBe(false);
        expect(filter?.predicate?.(query(['other']))).toBe(false);

        await cancelTimelineQueriesForThread(queryClient, 'thread_a');
        const threadFilter = cancelSpy.mock.calls[1]?.[0];
        expect(threadFilter?.predicate?.(query(timelineQueryKeys.threadPages('thread_a')))).toBe(
            true,
        );
        expect(threadFilter?.predicate?.(query(timelineQueryKeys.threadPages('thread_b')))).toBe(
            false,
        );
    });

    it('invalidates active semantic query slices without touching unrelated threads', async () => {
        const queryClient = new QueryClient();
        const invalidateSpy = jest
            .spyOn(queryClient, 'invalidateQueries')
            .mockResolvedValue(undefined);

        await invalidateTimelineQueriesForThread(queryClient, 'thread_a');
        await invalidateThreadTimelinePages(queryClient, 'thread_a');
        await invalidateTurnWorkQueries(queryClient, 'thread_a', 'turn_a');
        await invalidateTimelineQueriesForThread(queryClient, null);
        await invalidateTurnWorkQueries(queryClient, 'thread_a', null);

        expect(invalidateSpy).toHaveBeenCalledTimes(3);
        expect(invalidateSpy.mock.calls[0]?.[0]).toEqual({
            queryKey: timelineQueryKeys.thread('thread_a'),
            refetchType: 'active',
        });
        expect(invalidateSpy.mock.calls[1]?.[0]).toEqual({
            queryKey: timelineQueryKeys.threadPages('thread_a'),
            refetchType: 'active',
        });
        expect(invalidateSpy.mock.calls[2]?.[0]).toEqual({
            queryKey: timelineQueryKeys.turnWork('thread_a', 'turn_a'),
            refetchType: 'active',
        });
    });

    it('removes all cached semantic pages for a closed thread viewport', () => {
        const queryClient = new QueryClient();
        const removeSpy = jest.spyOn(queryClient, 'removeQueries').mockImplementation(() => {});

        removeTimelineQueriesForThread(queryClient, 'thread_a');

        expect(removeSpy).toHaveBeenCalledWith({
            queryKey: timelineQueryKeys.thread('thread_a'),
        });
    });

    it('does not retry cancellation, stale cursor, or validation errors', () => {
        expect(
            timelineQueryRetry(
                0,
                new PioneerClientNativeError('cancelled', TIMELINE_FFI_ERROR_CODES.cancelled),
            ),
        ).toBe(false);
        expect(
            timelineQueryRetry(
                0,
                new PioneerClientNativeError('stale', TIMELINE_FFI_ERROR_CODES.staleCursor),
            ),
        ).toBe(false);
        expect(
            timelineQueryRetry(
                0,
                new PioneerClientNativeError('bad limit', TIMELINE_FFI_ERROR_CODES.validation),
            ),
        ).toBe(false);
        expect(
            timelineQueryRetry(
                2,
                new PioneerClientNativeError(
                    'reconnect',
                    TIMELINE_FFI_ERROR_CODES.reconnectRequired,
                ),
            ),
        ).toBe(true);
        expect(timelineQueryRetry(2, new Error('generic'))).toBe(false);
        expect(timelineQueryRetryDelay(10)).toBe(4_000);
    });
});

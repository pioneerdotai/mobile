import { describe, expect, it, jest } from '@jest/globals';
import { QueryClient, type InfiniteData } from '@tanstack/react-query';

import type {
    TimelinePageAnchor,
    TurnWorkBlock,
    TurnWorkItem,
    TurnWorkItemsGetResponse,
    TurnWorkPageResponse,
} from '@/client';

import { timelineQueryKeys } from './timeline-query';
import {
    applyTurnWorkItemsGetResponse,
    cachedTurnWorkItemIdsByTurn,
    flattenTurnWorkItems,
    latestTurnWorkBlock,
    mergeTurnWorkInfiniteData,
    patchTurnWorkItemsQueries,
    type TurnWorkInfiniteData,
} from './turn-work-cache';

jest.mock('@/client', () => ({
    PioneerClientNativeError: class PioneerClientNativeError extends Error {
        code: string | null;

        constructor(message: string, code: string | null = null) {
            super(message);
            this.code = code;
        }
    },
}));

const item = (index: number, overrides: Partial<TurnWorkItem> = {}): TurnWorkItem =>
    ({
        workItemId: `work_${index.toString().padStart(3, '0')}`,
        itemId: `item_${index.toString().padStart(3, '0')}`,
        turnId: 'turn_a',
        orderKey: index.toString().padStart(3, '0'),
        status: 'completed',
        sourceSequence: index,
        sourceUpdatedAtUnixMicros: index,
        ...overrides,
    }) as TurnWorkItem;

const work = (state: TurnWorkBlock['state']): TurnWorkBlock =>
    ({ turnId: 'turn_a', state }) as TurnWorkBlock;

const page = (
    items: TurnWorkItem[],
    sourceHighWatermark: number,
    state: TurnWorkBlock['state'] = 'running',
): TurnWorkPageResponse =>
    ({
        workspaceId: 'workspace_a',
        threadId: 'thread_a',
        turnId: 'turn_a',
        projectionVersion: 1,
        sourceHighWatermark,
        projectionUpdatedAtUnixMicros: sourceHighWatermark,
        work: work(state),
        page: {},
        items,
    }) as TurnWorkPageResponse;

const data = (
    pages: TurnWorkPageResponse[],
): InfiniteData<TurnWorkPageResponse, TimelinePageAnchor> => ({
    pages,
    pageParams: pages.map((_, index) =>
        index === 0
            ? { kind: 'newest' }
            : ({ kind: 'before', cursor: { value: `cursor_${index}` } } as TimelinePageAnchor),
    ),
});

const exactResponse = (
    items: TurnWorkItem[],
    sourceHighWatermark: number,
    removedWorkItemIds: string[] = [],
): TurnWorkItemsGetResponse => ({
    workspaceId: 'workspace_a',
    threadId: 'thread_a',
    turnId: 'turn_a',
    projectionVersion: 1,
    sourceHighWatermark,
    projectionUpdatedAtUnixMicros: sourceHighWatermark,
    items,
    removedWorkItemIds,
});

describe('mobile turn work cache policy', () => {
    it('updates an old loaded item without replacing the accumulated 100-item range', () => {
        const newest = Array.from({ length: 50 }, (_, index) => item(index + 50));
        const older = Array.from({ length: 50 }, (_, index) => item(index));
        const current = data([page(newest, 100), page(older, 90)]);
        const completed = item(5, {
            status: 'completed',
            sourceSequence: 200,
            sourceUpdatedAtUnixMicros: 200,
        });

        const updated = applyTurnWorkItemsGetResponse(current, exactResponse([completed], 200));
        const items = flattenTurnWorkItems(updated?.pages ?? []);

        expect(items).toHaveLength(100);
        expect(items.find((candidate) => candidate.workItemId === 'work_005')).toEqual(completed);
    });

    it('keeps the previous newest batch when React Query refetches it with 50 new items', () => {
        const previous = data([
            page(
                Array.from({ length: 50 }, (_, index) => item(index)),
                50,
            ),
        ]);
        const incoming = data([
            page(
                Array.from({ length: 50 }, (_, index) => item(index + 50)),
                100,
            ),
        ]);

        const merged = mergeTurnWorkInfiniteData(previous, incoming);

        expect(flattenTurnWorkItems(merged.pages)).toHaveLength(100);
        expect(flattenTurnWorkItems(merged.pages)[0]?.workItemId).toBe('work_000');
        expect(flattenTurnWorkItems(merged.pages)[99]?.workItemId).toBe('work_099');
    });

    it('does not let an older page response resurrect an exactly removed item', () => {
        const initial = data([page([item(1)], 20)]);
        const removed = applyTurnWorkItemsGetResponse(initial, exactResponse([], 30, ['work_001']));
        const staleRefetch = data([page([item(1, { sourceSequence: 20 })], 20)]);

        const merged = mergeTurnWorkInfiniteData(removed, staleRefetch);

        expect(flattenTurnWorkItems(merged.pages)).toHaveLength(0);
    });

    it('preserves exact-removal tombstones through React Query structural sharing', () => {
        const queryClient = new QueryClient();
        const queryKey = timelineQueryKeys.turnWorkPagesForLimit('thread_a', 'turn_a', 30);
        queryClient.setQueryDefaults(queryKey, {
            structuralSharing: (existing, incoming) =>
                mergeTurnWorkInfiniteData(
                    existing as TurnWorkInfiniteData | undefined,
                    incoming as TurnWorkInfiniteData,
                ),
        });
        queryClient.setQueryData(queryKey, data([page([item(1)], 20)]));

        patchTurnWorkItemsQueries(queryClient, exactResponse([], 30, ['work_001']));
        queryClient.setQueryData(queryKey, data([page([item(1, { sourceSequence: 20 })], 20)]));

        const cached = queryClient.getQueryData<TurnWorkInfiniteData>(queryKey);
        expect(flattenTurnWorkItems(cached?.pages ?? [])).toHaveLength(0);
        queryClient.clear();
    });

    it('does not apply removals from an exact response older than the cached range', () => {
        const current = data([page([item(1)], 20)]);

        const updated = applyTurnWorkItemsGetResponse(current, exactResponse([], 19, ['work_001']));

        expect(flattenTurnWorkItems(updated?.pages ?? [])).toHaveLength(1);
    });

    it('uses projection revision instead of page array position for work state', () => {
        const pages = [page([], 20, 'completed'), page([], 10, 'running')];

        expect(latestTurnWorkBlock(pages, null)?.state).toBe('completed');
    });

    it('keeps top-level work metadata authoritative over page snapshots', () => {
        const fallback = work('completed');

        expect(latestTurnWorkBlock([page([], 20, 'running')], fallback)).toBe(fallback);
    });

    it('collects all cached IDs by turn for reconnect reconciliation', () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(
            timelineQueryKeys.turnWorkPagesForLimit('thread_a', 'turn_a', 30),
            data([page([item(1, { status: 'running' }), item(2, { status: 'completed' })], 20)]),
        );

        expect(cachedTurnWorkItemIdsByTurn(queryClient, 'thread_a')).toEqual(
            new Map([['turn_a', ['work_001', 'work_002']]]),
        );
        queryClient.clear();
    });
});

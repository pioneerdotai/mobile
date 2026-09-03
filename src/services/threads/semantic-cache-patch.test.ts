import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, type InfiniteData } from '@tanstack/react-query';

import type { SemanticTimelineCachePatch } from '@/client/generated/client_active_thread_event_result';
import type {
    ThreadTimelinePageResponse,
    TimelineBlock,
    TimelinePageAnchor,
    TurnWorkBlock,
    TurnWorkItem,
    TurnWorkPageResponse,
} from '@/client';

import {
    applySemanticTimelineCachePatch,
    seedEmptyThreadTimelineCache,
} from './semantic-cache-patch';
import { DEFAULT_THREAD_TIMELINE_PAGE_LIMIT, timelineQueryKeys } from './timeline-query';

jest.mock('@/client', () => ({
    PioneerClientNativeError: class PioneerClientNativeError extends Error {
        code: string | null;

        constructor(message: string, code: string | null = null) {
            super(message);
            this.code = code;
        }
    },
}));

type ThreadTimelineData = InfiniteData<ThreadTimelinePageResponse, TimelinePageAnchor>;

const timelineBlock = (blockId: string, sortKey: string, text: string): TimelineBlock =>
    ({
        workspaceId: 'workspace_a',
        threadId: 'thread_a',
        turnId: `turn_${blockId}`,
        blockId,
        sortKey,
        kind: { kind: 'assistant_message', itemId: blockId, text },
    }) as TimelineBlock;

const turnWork = (state: TurnWorkBlock['state']): TurnWorkBlock =>
    ({ turnId: 'turn_a', state }) as TurnWorkBlock;

const workItem = (
    workItemId: string,
    orderKey: string,
    status: TurnWorkItem['status'],
    sourceSequence: number,
): TurnWorkItem =>
    ({
        workItemId,
        itemId: `item_${workItemId}`,
        turnId: 'turn_a',
        orderKey,
        status,
        sourceSequence,
        sourceUpdatedAtUnixMicros: sourceSequence,
    }) as TurnWorkItem;

describe('mobile semantic timeline cache seed', () => {
    const queryClients: QueryClient[] = [];

    afterEach(() => {
        for (const queryClient of queryClients) {
            queryClient.clear();
        }
        queryClients.length = 0;
    });

    it('seeds an empty default thread timeline query for newly-created threads', () => {
        const queryClient = new QueryClient();
        queryClients.push(queryClient);

        seedEmptyThreadTimelineCache(queryClient, 'workspace_a', 'thread_a');

        const data = queryClient.getQueryData<ThreadTimelineData>(
            timelineQueryKeys.threadPagesForLimit('thread_a', DEFAULT_THREAD_TIMELINE_PAGE_LIMIT),
        );
        expect(data?.pages[0]).toMatchObject({
            workspaceId: 'workspace_a',
            threadId: 'thread_a',
            blocks: [],
        });
    });

    it('does not replace an existing thread timeline query', () => {
        const queryClient = new QueryClient();
        queryClients.push(queryClient);
        const queryKey = timelineQueryKeys.threadPagesForLimit(
            'thread_a',
            DEFAULT_THREAD_TIMELINE_PAGE_LIMIT,
        );
        queryClient.setQueryData<ThreadTimelineData>(queryKey, {
            pages: [
                {
                    workspaceId: 'workspace_a',
                    threadId: 'thread_a',
                    projectionVersion: 1,
                    blocks: [
                        {
                            blockId: 'block_a',
                        },
                    ],
                    page: {
                        beforeCursor: null,
                        afterCursor: null,
                        hasMoreBefore: false,
                        hasMoreAfter: false,
                    },
                } as unknown as ThreadTimelinePageResponse,
            ],
            pageParams: [{ kind: 'newest' }],
        });

        seedEmptyThreadTimelineCache(queryClient, 'workspace_a', 'thread_a');

        const data = queryClient.getQueryData<ThreadTimelineData>(queryKey);
        expect(data?.pages[0]?.projectionVersion).toBe(1);
        expect(data?.pages[0]?.blocks?.map((block) => block.blockId)).toEqual(['block_a']);
    });

    it('patches only touched blocks while preserving every loaded infinite-scroll page', () => {
        const queryClient = new QueryClient();
        queryClients.push(queryClient);
        const queryKey = timelineQueryKeys.threadPagesForLimit('thread_a', 12);
        const newest = timelineBlock('block_newest', '003', 'newest');
        const historical = timelineBlock('block_historical', '001', 'old');
        queryClient.setQueryData<ThreadTimelineData>(queryKey, {
            pages: [
                {
                    workspaceId: 'workspace_a',
                    threadId: 'thread_a',
                    projectionVersion: 1,
                    blocks: [newest],
                    page: {},
                } as ThreadTimelinePageResponse,
                {
                    workspaceId: 'workspace_a',
                    threadId: 'thread_a',
                    projectionVersion: 1,
                    blocks: [historical],
                    page: {},
                } as ThreadTimelinePageResponse,
            ],
            pageParams: [{ kind: 'newest' }, { kind: 'before', cursor: { value: 'before' } }],
        });
        const updatedHistorical = timelineBlock('block_historical', '001', 'updated');
        const inserted = timelineBlock('block_inserted', '004', 'inserted');

        applySemanticTimelineCachePatch(queryClient, {
            workspace_id: 'workspace_a',
            thread_id: 'thread_a',
            changed_blocks: [updatedHistorical, inserted],
        } as SemanticTimelineCachePatch);

        const data = queryClient.getQueryData<ThreadTimelineData>(queryKey);
        expect(data?.pages).toHaveLength(2);
        expect(data?.pageParams).toHaveLength(2);
        expect(data?.pages[0]?.blocks?.map((block) => block.blockId)).toEqual([
            'block_newest',
            'block_inserted',
        ]);
        expect(data?.pages[1]?.blocks).toEqual([updatedHistorical]);
    });

    it('patches exact work items and work state without refetching or dropping loaded pages', () => {
        const queryClient = new QueryClient();
        queryClients.push(queryClient);
        const queryKey = timelineQueryKeys.turnWorkPagesForLimit('thread_a', 'turn_a', 30);
        queryClient.setQueryData(queryKey, {
            pages: [
                {
                    workspaceId: 'workspace_a',
                    threadId: 'thread_a',
                    turnId: 'turn_a',
                    projectionVersion: 1,
                    sourceHighWatermark: 1,
                    projectionUpdatedAtUnixMicros: 1,
                    work: turnWork('running'),
                    items: [workItem('work_newest', '003', 'running', 1)],
                    page: {},
                } as TurnWorkPageResponse,
                {
                    workspaceId: 'workspace_a',
                    threadId: 'thread_a',
                    turnId: 'turn_a',
                    projectionVersion: 1,
                    sourceHighWatermark: 1,
                    projectionUpdatedAtUnixMicros: 1,
                    work: turnWork('running'),
                    items: [workItem('work_historical', '001', 'running', 1)],
                    page: {},
                } as TurnWorkPageResponse,
            ],
            pageParams: [{ kind: 'newest' }, { kind: 'before', cursor: { value: 'before' } }],
        });
        const completedHistorical = workItem('work_historical', '001', 'completed', 2);
        const inserted = workItem('work_inserted', '004', 'running', 2);
        const waitingWork = turnWork('waiting_for_approval');
        const workBlock = {
            workspaceId: 'workspace_a',
            threadId: 'thread_a',
            turnId: 'turn_a',
            blockId: 'turn:turn_a:work',
            sortKey: '002',
            kind: { kind: 'turn_work', work: waitingWork },
        } as TimelineBlock;

        applySemanticTimelineCachePatch(queryClient, {
            workspace_id: 'workspace_a',
            thread_id: 'thread_a',
            changed_blocks: [workBlock],
            changed_work_items: [completedHistorical, inserted],
            removed_work_items: [{ turn_id: 'turn_a', work_item_id: 'work_newest' }],
        } as SemanticTimelineCachePatch);

        const data =
            queryClient.getQueryData<InfiniteData<TurnWorkPageResponse, TimelinePageAnchor>>(
                queryKey,
            );
        expect(data?.pages).toHaveLength(2);
        expect(data?.pageParams).toHaveLength(2);
        expect(data?.pages[0]?.work).toEqual(waitingWork);
        expect(data?.pages[0]?.items?.map((item) => item.workItemId)).toEqual(['work_inserted']);
        expect(data?.pages[1]?.work).toEqual(waitingWork);
        expect(data?.pages[1]?.items).toEqual([completedHistorical]);
    });

    it('does not insert a missing live block when the newest boundary is not loaded', () => {
        const queryClient = new QueryClient();
        queryClients.push(queryClient);
        const queryKey = timelineQueryKeys.threadPagesForLimit('thread_a', 12);
        const historical = timelineBlock('block_historical', '001', 'old');
        queryClient.setQueryData<ThreadTimelineData>(queryKey, {
            pages: [
                {
                    workspaceId: 'workspace_a',
                    threadId: 'thread_a',
                    projectionVersion: 1,
                    blocks: [historical],
                    page: { hasMoreAfter: true },
                } as ThreadTimelinePageResponse,
            ],
            pageParams: [{ kind: 'oldest' }],
        });

        applySemanticTimelineCachePatch(queryClient, {
            workspace_id: 'workspace_a',
            thread_id: 'thread_a',
            changed_blocks: [timelineBlock('block_live', '100', 'live')],
        } as SemanticTimelineCachePatch);

        const data = queryClient.getQueryData<ThreadTimelineData>(queryKey);
        expect(data?.pages[0]?.blocks).toEqual([historical]);
    });

    it('clears a cached work range from a canonical work-block tombstone', () => {
        const queryClient = new QueryClient();
        queryClients.push(queryClient);
        const queryKey = timelineQueryKeys.turnWorkPagesForLimit('thread_a', 'turn_a', 30);
        queryClient.setQueryData(queryKey, {
            pages: [
                {
                    workspaceId: 'workspace_a',
                    threadId: 'thread_a',
                    turnId: 'turn_a',
                    projectionVersion: 1,
                    sourceHighWatermark: 1,
                    projectionUpdatedAtUnixMicros: 1,
                    work: turnWork('running'),
                    items: [workItem('work_a', '001', 'running', 1)],
                    page: {},
                } as TurnWorkPageResponse,
                {
                    workspaceId: 'workspace_a',
                    threadId: 'thread_a',
                    turnId: 'turn_a',
                    projectionVersion: 1,
                    sourceHighWatermark: 1,
                    projectionUpdatedAtUnixMicros: 1,
                    work: turnWork('running'),
                    items: [workItem('work_b', '002', 'completed', 1)],
                    page: {},
                } as TurnWorkPageResponse,
            ],
            pageParams: [{ kind: 'newest' }, { kind: 'before', cursor: { value: 'before' } }],
        });

        applySemanticTimelineCachePatch(queryClient, {
            workspace_id: 'workspace_a',
            thread_id: 'thread_a',
            changed_blocks: [
                {
                    workspaceId: 'workspace_a',
                    threadId: 'thread_a',
                    turnId: 'turn_a',
                    blockId: 'turn:turn_a:work',
                    sortKey: '002',
                    kind: { kind: 'turn_work', work: turnWork('completed') },
                } as TimelineBlock,
            ],
            removed_block_ids: ['turn:turn_a:work'],
        } as SemanticTimelineCachePatch);

        const data =
            queryClient.getQueryData<InfiniteData<TurnWorkPageResponse, TimelinePageAnchor>>(
                queryKey,
            );
        expect(data?.pages[0]?.work).toBeNull();
        expect(data?.pages[0]?.items).toEqual([]);
        expect(data?.pages[1]?.work).toBeNull();
        expect(data?.pages[1]?.items).toEqual([]);
    });
});

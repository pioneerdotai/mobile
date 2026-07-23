import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, type InfiniteData } from '@tanstack/react-query';

import type {
    ClientEvent,
    TimelinePageAnchor,
    TurnWorkItem,
    TurnWorkItemsGetResponse,
    TurnWorkPageResponse,
} from '@/client';

import { requestTurnWorkItemsGet } from './timeline-page-requests';
import { timelineQueryKeys } from './timeline-query';
import {
    reconcileTurnWorkItemsForEvent,
    reconcileTurnWorkItemsOnReconnect,
} from './turn-work-reconciliation';
import type { ActiveThreadTimelineEvent } from './live-timeline-events';

jest.mock('@/client', () => ({}));
jest.mock('./timeline-page-requests', () => ({
    requestTurnWorkItemsGet: jest.fn(),
}));

const requestMock = jest.mocked(requestTurnWorkItemsGet);

const item = (status: TurnWorkItem['status'], sourceSequence: number): TurnWorkItem =>
    ({
        workItemId: 'work_a',
        itemId: 'item_a',
        turnId: 'turn_a',
        orderKey: '001',
        status,
        sourceSequence,
        sourceUpdatedAtUnixMicros: sourceSequence,
    }) as TurnWorkItem;

const response = (workItem: TurnWorkItem): TurnWorkItemsGetResponse => ({
    workspaceId: 'workspace_a',
    threadId: 'thread_a',
    turnId: 'turn_a',
    projectionVersion: 1,
    sourceHighWatermark: workItem.sourceSequence,
    projectionUpdatedAtUnixMicros: workItem.sourceUpdatedAtUnixMicros,
    items: [workItem],
    removedWorkItemIds: [],
});

const queryData = (
    workItem: TurnWorkItem,
): InfiniteData<TurnWorkPageResponse, TimelinePageAnchor> => ({
    pages: [
        {
            workspaceId: 'workspace_a',
            threadId: 'thread_a',
            turnId: 'turn_a',
            projectionVersion: 1,
            sourceHighWatermark: workItem.sourceSequence,
            projectionUpdatedAtUnixMicros: workItem.sourceUpdatedAtUnixMicros,
            work: { turnId: 'turn_a', state: 'running' },
            page: {},
            items: [workItem],
        } as TurnWorkPageResponse,
    ],
    pageParams: [{ kind: 'newest' }],
});

const changedEvent = (): ActiveThreadTimelineEvent =>
    ({
        GatewayNotification: {
            kind: 'turn_work_items_changed',
            params: {
                workspaceId: 'workspace_a',
                threadId: 'thread_a',
                turnId: 'turn_a',
                changedWorkItemIds: ['work_a'],
                removedWorkItemIds: [],
                reason: 'live_event',
            },
        },
    }) as ClientEvent as ActiveThreadTimelineEvent;

describe('mobile turn work reconciliation', () => {
    beforeEach(() => {
        requestMock.mockReset();
    });

    it('fetches changed IDs and patches existing React Query ranges', async () => {
        const queryClient = new QueryClient();
        const queryKey = timelineQueryKeys.turnWorkPagesForLimit('thread_a', 'turn_a', 30);
        queryClient.setQueryData(queryKey, queryData(item('running', 1)));
        requestMock.mockResolvedValue([response(item('completed', 2))]);

        await reconcileTurnWorkItemsForEvent(queryClient, changedEvent());

        expect(requestMock).toHaveBeenCalledWith({
            threadId: 'thread_a',
            turnId: 'turn_a',
            workItemIds: ['work_a'],
        });
        const cached =
            queryClient.getQueryData<InfiniteData<TurnWorkPageResponse, TimelinePageAnchor>>(
                queryKey,
            );
        expect(cached?.pages[0]?.items?.[0]?.status).toBe('completed');
        queryClient.clear();
    });

    it('reconciles cached running IDs when the gateway reconnects', async () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(
            timelineQueryKeys.turnWorkPagesForLimit('thread_a', 'turn_a', 30),
            queryData(item('running', 1)),
        );
        requestMock.mockResolvedValue([response(item('completed', 2))]);

        await reconcileTurnWorkItemsOnReconnect(queryClient, 'thread_a');

        expect(requestMock).toHaveBeenCalledWith({
            threadId: 'thread_a',
            turnId: 'turn_a',
            workItemIds: ['work_a'],
        });
        queryClient.clear();
    });
});

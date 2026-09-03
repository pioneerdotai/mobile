import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, type InfiniteData } from '@tanstack/react-query';

import type {
    TimelinePageAnchor,
    TurnWorkItem,
    TurnWorkItemsGetResponse,
    TurnWorkPageResponse,
} from '@/client';

import { requestTurnWorkItemsGet } from './timeline-page-requests';
import { timelineQueryKeys } from './timeline-query';
import { reconcileTurnWorkItemsOnReconnect } from './turn-work-reconciliation';

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

describe('mobile turn work reconciliation', () => {
    beforeEach(() => {
        requestMock.mockReset();
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

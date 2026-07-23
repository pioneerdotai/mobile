import { describe, expect, it, jest } from '@jest/globals';

import type { TurnWorkItemsGetResponse } from '@/client';

import { createTurnWorkItemsRequestCoordinator } from './timeline-page-requests';

jest.mock('@/client', () => ({
    pioneerClient: {
        threadTimelinePage: jest.fn(),
        turnWorkPage: jest.fn(),
        turnWorkItemsGet: jest.fn(),
    },
}));

const response = (workItemIds: string[]): TurnWorkItemsGetResponse =>
    ({
        workspaceId: 'workspace_a',
        threadId: 'thread_a',
        turnId: 'turn_a',
        projectionVersion: 1,
        items: workItemIds.map((workItemId) => ({ workItemId })),
    }) as TurnWorkItemsGetResponse;

const deferred = <T>() => {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((promiseResolve, promiseReject) => {
        resolve = promiseResolve;
        reject = promiseReject;
    });
    return { promise, resolve, reject };
};

describe('mobile turn work exact request coordinator', () => {
    it('runs a trailing request and unions invalidations received in flight', async () => {
        const first = deferred<TurnWorkItemsGetResponse>();
        const runner = jest
            .fn<(params: { workItemIds: string[] }) => Promise<TurnWorkItemsGetResponse>>()
            .mockImplementationOnce(() => first.promise)
            .mockImplementation(async (params) => response(params.workItemIds));
        const request = createTurnWorkItemsRequestCoordinator(runner);

        const initial = request({
            threadId: 'thread_a',
            turnId: 'turn_a',
            workItemIds: ['work_a'],
        });
        const trailingA = request({
            threadId: 'thread_a',
            turnId: 'turn_a',
            workItemIds: ['work_b'],
        });
        const trailingB = request({
            threadId: 'thread_a',
            turnId: 'turn_a',
            workItemIds: ['work_b', 'work_c'],
        });

        expect(runner).toHaveBeenCalledTimes(1);
        first.resolve(response(['work_a']));
        await initial;
        await Promise.all([trailingA, trailingB]);

        expect(runner).toHaveBeenCalledTimes(2);
        expect(runner.mock.calls[1]?.[0].workItemIds).toEqual(['work_b', 'work_c']);
    });

    it('splits a coalesced exact request at the server limit', async () => {
        const runner = jest
            .fn<(params: { workItemIds: string[] }) => Promise<TurnWorkItemsGetResponse>>()
            .mockImplementation(async (params) => response(params.workItemIds));
        const request = createTurnWorkItemsRequestCoordinator(runner);
        const workItemIds = Array.from({ length: 201 }, (_, index) => `work_${index}`);

        await request({ threadId: 'thread_a', turnId: 'turn_a', workItemIds });

        expect(runner).toHaveBeenCalledTimes(2);
        expect(runner.mock.calls[0]?.[0].workItemIds).toHaveLength(200);
        expect(runner.mock.calls[1]?.[0].workItemIds).toEqual(['work_200']);
    });
});

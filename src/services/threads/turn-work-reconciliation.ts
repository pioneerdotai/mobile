import type { QueryClient } from '@tanstack/react-query';

import { requestTurnWorkItemsGet } from './timeline-page-requests';
import { invalidateTimelineQueriesForThread } from './timeline-query';
import { cachedTurnWorkItemIdsByTurn, patchTurnWorkItemsQueries } from './turn-work-cache';
import type { ActiveThreadTimelineEvent } from './live-timeline-events';

export const reconcileTurnWorkItemsForEvent = async (
    queryClient: QueryClient,
    event: ActiveThreadTimelineEvent,
): Promise<boolean> => {
    const notification = event.GatewayNotification;
    if (notification.kind !== 'turn_work_items_changed') {
        return false;
    }

    const workItemIds = Array.from(
        new Set([
            ...(notification.params.changedWorkItemIds ?? []),
            ...(notification.params.removedWorkItemIds ?? []),
        ]),
    );
    const responses = await requestTurnWorkItemsGet({
        threadId: notification.params.threadId,
        turnId: notification.params.turnId,
        workItemIds,
    });
    for (const response of responses) {
        patchTurnWorkItemsQueries(queryClient, response);
    }
    return responses.length > 0;
};

export const reconcileTurnWorkItemsOnReconnect = async (
    queryClient: QueryClient,
    threadId: string,
): Promise<void> => {
    const exactRequests = Array.from(
        cachedTurnWorkItemIdsByTurn(queryClient, threadId),
        async ([turnId, workItemIds]) => {
            const responses = await requestTurnWorkItemsGet({
                threadId,
                turnId,
                workItemIds,
            });
            for (const response of responses) {
                patchTurnWorkItemsQueries(queryClient, response);
            }
        },
    );

    await Promise.allSettled([
        invalidateTimelineQueriesForThread(queryClient, threadId),
        ...exactRequests,
    ]);
};

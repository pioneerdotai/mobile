import type { QueryClient } from '@tanstack/react-query';

import { requestTurnWorkItemsGet } from './timeline-page-requests';
import { invalidateTimelineQueriesForThread } from './timeline-query';
import { cachedTurnWorkItemIdsByTurn, patchTurnWorkItemsQueries } from './turn-work-cache';
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

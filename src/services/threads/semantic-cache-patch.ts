import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { ThreadTimelinePageResponse } from '@/client';
import {
    DEFAULT_THREAD_TIMELINE_PAGE_LIMIT,
    timelineQueryKeys,
} from '@/services/threads/timeline-query';

type ThreadTimelineData = InfiniteData<ThreadTimelinePageResponse, unknown>;

const emptyPageInfo = {
    beforeCursor: null,
    afterCursor: null,
    hasMoreBefore: false,
    hasMoreAfter: false,
};

export const seedEmptyThreadTimelineCache = (
    queryClient: QueryClient,
    workspaceId: string,
    threadId: string,
) => {
    const queryKey = timelineQueryKeys.threadPagesForLimit(
        threadId,
        DEFAULT_THREAD_TIMELINE_PAGE_LIMIT,
    );

    if (queryClient.getQueryData<ThreadTimelineData>(queryKey)) {
        return;
    }

    queryClient.setQueryData<ThreadTimelineData>(queryKey, {
        pages: [emptyThreadTimelinePage(workspaceId, threadId)],
        pageParams: [{ kind: 'newest' }],
    });
};

const emptyThreadTimelinePage = (
    workspaceId: string,
    threadId: string,
): ThreadTimelinePageResponse => ({
    workspaceId,
    threadId,
    projectionVersion: 0,
    blocks: [],
    page: emptyPageInfo,
});

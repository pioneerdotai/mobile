import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, type InfiniteData } from '@tanstack/react-query';

import type { ThreadTimelinePageResponse } from '@/client';

import { seedEmptyThreadTimelineCache } from './semantic-cache-patch';
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

type ThreadTimelineData = InfiniteData<ThreadTimelinePageResponse, unknown>;

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
});

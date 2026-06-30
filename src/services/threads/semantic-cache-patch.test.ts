import { describe, expect, it, mock } from 'bun:test';
import { QueryClient, type InfiniteData } from '@tanstack/react-query';

import type { ThreadTimelinePageResponse, TimelineBlock } from '@/client';

mock.module('@/client', () => ({
    PioneerClientNativeError: class PioneerClientNativeError extends Error {
        code: string | null;

        constructor(message: string, code: string | null = null) {
            super(message);
            this.code = code;
        }
    },
}));

const { applySemanticTimelinePatchToCache } = await import('./semantic-cache-patch');
const { DEFAULT_THREAD_TIMELINE_PAGE_LIMIT, timelineQueryKeys } = await import('./timeline-query');

type ThreadTimelineData = InfiniteData<ThreadTimelinePageResponse, unknown>;

const pageInfo = {
    beforeCursor: null,
    afterCursor: null,
    hasMoreBefore: false,
    hasMoreAfter: false,
};

const threadPage = (
    threadId: string,
    workspaceId: string,
    blocks: TimelineBlock[] = [],
): ThreadTimelinePageResponse => ({
    workspaceId,
    threadId,
    projectionVersion: 0,
    blocks,
    page: pageInfo,
});

const timelineBlock = (id: string, sortKey: string): TimelineBlock =>
    ({
        workspaceId: 'workspace_a',
        threadId: 'thread_a',
        blockId: id,
        sortKey,
        kind: { kind: 'user_message', message: { id } },
    }) as unknown as TimelineBlock;

describe('mobile semantic timeline cache patch', () => {
    it('updates mounted thread timeline queries keyed by page limit', () => {
        const queryClient = new QueryClient();
        const queryKey = timelineQueryKeys.threadPagesForLimit(
            'thread_a',
            DEFAULT_THREAD_TIMELINE_PAGE_LIMIT,
        );
        queryClient.setQueryData<ThreadTimelineData>(queryKey, {
            pages: [threadPage('thread_a', 'workspace_a', [timelineBlock('block_1', '001')])],
            pageParams: [{ kind: 'newest' }],
        });

        applySemanticTimelinePatchToCache(queryClient, {
            workspace_id: 'workspace_a',
            thread_id: 'thread_a',
            changed_blocks: [timelineBlock('block_2', '002')],
        });

        const data = queryClient.getQueryData<ThreadTimelineData>(queryKey);
        expect(data?.pages[0]?.blocks?.map((block) => block.blockId)).toEqual([
            'block_1',
            'block_2',
        ]);
    });

    it('seeds the default thread timeline query for newly-created threads', () => {
        const queryClient = new QueryClient();

        applySemanticTimelinePatchToCache(queryClient, {
            workspace_id: 'workspace_a',
            thread_id: 'thread_a',
            changed_blocks: [timelineBlock('block_1', '001')],
        });

        const data = queryClient.getQueryData<ThreadTimelineData>(
            timelineQueryKeys.threadPagesForLimit('thread_a', DEFAULT_THREAD_TIMELINE_PAGE_LIMIT),
        );
        expect(data?.pages[0]?.blocks?.map((block) => block.blockId)).toEqual(['block_1']);
    });
});

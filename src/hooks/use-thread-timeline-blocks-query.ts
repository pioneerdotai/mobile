import { useMemo } from 'react';
import {
    useInfiniteQuery,
    type InfiniteData,
    type UseInfiniteQueryResult,
} from '@tanstack/react-query';

import {
    PioneerClientNativeError,
    type ThreadTimelinePageResponse,
    type TimelineBlock,
    type TimelinePageAnchor,
} from '@/client';
import { requestThreadTimelinePage } from '@/services/threads/timeline-page-requests';
import { protocolKeyCompare } from '@/services/threads/protocol-key-order';
import {
    DEFAULT_THREAD_TIMELINE_PAGE_LIMIT,
    TIMELINE_FFI_ERROR_CODES,
    timelineQueryKeys,
} from '@/services/threads/timeline-query';

const NEWEST_TIMELINE_ANCHOR: TimelinePageAnchor = { kind: 'newest' };

type ThreadTimelineBlocksQueryOptions = {
    threadId: string | null;
    enabled: boolean;
    limit?: number | null;
    initialAnchor?: TimelinePageAnchor;
};

type ThreadTimelineBlocksQueryResult = UseInfiniteQueryResult<
    InfiniteData<ThreadTimelinePageResponse, TimelinePageAnchor>,
    Error
>;

type ThreadTimelineBlocksQueryControls = Pick<
    ThreadTimelineBlocksQueryResult,
    | 'error'
    | 'isLoading'
    | 'refetch'
    | 'hasNextPage'
    | 'isFetchingNextPage'
    | 'fetchNextPage'
    | 'hasPreviousPage'
    | 'isFetchingPreviousPage'
    | 'fetchPreviousPage'
>;

type ThreadTimelineBlocksResult = ThreadTimelineBlocksQueryControls & {
    blocks: TimelineBlock[];
    pages: ThreadTimelinePageResponse[];
    hasLoadedPage: boolean;
};

export const useThreadTimelineBlocksQuery = ({
    threadId,
    enabled,
    limit = DEFAULT_THREAD_TIMELINE_PAGE_LIMIT,
    initialAnchor = NEWEST_TIMELINE_ANCHOR,
}: ThreadTimelineBlocksQueryOptions): ThreadTimelineBlocksResult => {
    const query = useInfiniteQuery<
        ThreadTimelinePageResponse,
        Error,
        InfiniteData<ThreadTimelinePageResponse, TimelinePageAnchor>,
        ReturnType<typeof timelineQueryKeys.threadPagesForLimit>,
        TimelinePageAnchor
    >({
        queryKey: timelineQueryKeys.threadPagesForLimit(threadId ?? '__inactive_thread__', limit),
        enabled: enabled && Boolean(threadId),
        initialPageParam: initialAnchor,
        queryFn: async ({ pageParam, signal }) => {
            throwIfTimelineQueryAborted(signal);

            if (!threadId) {
                throw new PioneerClientNativeError(
                    'thread timeline query requires threadId',
                    TIMELINE_FFI_ERROR_CODES.validation,
                );
            }

            const page = await requestThreadTimelinePage({
                threadId,
                anchor: pageParam,
                limit,
            });

            throwIfTimelineQueryAborted(signal);
            return page;
        },
        getNextPageParam: (lastPage) => {
            if (!lastPage.page.hasMoreBefore || !lastPage.page.beforeCursor) {
                return undefined;
            }

            return { kind: 'before', cursor: lastPage.page.beforeCursor };
        },
        getPreviousPageParam: (firstPage) => {
            if (!firstPage.page.hasMoreAfter || !firstPage.page.afterCursor) {
                return undefined;
            }

            return { kind: 'after', cursor: firstPage.page.afterCursor };
        },
    });

    const pages = useMemo(() => query.data?.pages ?? [], [query.data?.pages]);
    const blocks = useMemo(() => flattenThreadTimelineBlocks(pages), [pages]);

    const {
        error,
        fetchNextPage,
        fetchPreviousPage,
        hasNextPage,
        hasPreviousPage,
        isFetchingNextPage,
        isFetchingPreviousPage,
        isLoading,
        refetch,
    } = query;

    return {
        error,
        fetchNextPage,
        fetchPreviousPage,
        hasNextPage,
        hasPreviousPage,
        isFetchingNextPage,
        isFetchingPreviousPage,
        isLoading,
        refetch,
        blocks,
        pages,
        hasLoadedPage: pages.length > 0,
    };
};

export const flattenThreadTimelineBlocks = (
    pages: readonly ThreadTimelinePageResponse[],
): TimelineBlock[] => {
    const blocksById = new Map<string, TimelineBlock>();

    for (const page of pages) {
        for (const block of page.blocks ?? []) {
            blocksById.set(block.blockId, block);
        }
    }

    return Array.from(blocksById.values()).sort(
        (left, right) =>
            protocolKeyCompare(left.sortKey, right.sortKey) ||
            protocolKeyCompare(left.blockId, right.blockId),
    );
};

const throwIfTimelineQueryAborted = (signal: AbortSignal) => {
    if (!signal.aborted) {
        return;
    }

    throw new PioneerClientNativeError(
        'timeline query cancelled',
        TIMELINE_FFI_ERROR_CODES.cancelled,
    );
};

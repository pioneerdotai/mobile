import { useMemo } from 'react';
import {
    useInfiniteQuery,
    type InfiniteData,
    type UseInfiniteQueryResult,
} from '@tanstack/react-query';

import {
    pioneerClient,
    PioneerClientNativeError,
    type TimelinePageAnchor,
    type TurnWorkBlock,
    type TurnWorkItem,
    type TurnWorkPageResponse,
} from '@/client';
import {
    TIMELINE_FFI_ERROR_CODES,
    timelineQueryKeys,
} from '@/services/threads/timeline-query';

const DEFAULT_TURN_WORK_PAGE_LIMIT = 100;
const NEWEST_WORK_ANCHOR: TimelinePageAnchor = { kind: 'newest' };

type TurnWorkItemsQueryOptions = {
    threadId: string | null;
    turnId: string | null;
    enabled: boolean;
    expanded?: boolean;
    liveVisible?: boolean;
    limit?: number | null;
    work?: TurnWorkBlock | null;
    initialAnchor?: TimelinePageAnchor;
};

type TurnWorkItemsQueryResult = UseInfiniteQueryResult<
    InfiniteData<TurnWorkPageResponse, TimelinePageAnchor>,
    Error
> & {
    items: TurnWorkItem[];
    pages: TurnWorkPageResponse[];
    work: TurnWorkBlock | null;
    hasLoadedPage: boolean;
};

export const useTurnWorkItemsQuery = ({
    threadId,
    turnId,
    enabled,
    expanded = false,
    liveVisible = false,
    limit = DEFAULT_TURN_WORK_PAGE_LIMIT,
    work,
    initialAnchor = NEWEST_WORK_ANCHOR,
}: TurnWorkItemsQueryOptions): TurnWorkItemsQueryResult => {
    const queryEnabled = enabled && Boolean(threadId && turnId && (expanded || liveVisible));

    const query = useInfiniteQuery<
        TurnWorkPageResponse,
        Error,
        InfiniteData<TurnWorkPageResponse, TimelinePageAnchor>,
        ReturnType<typeof timelineQueryKeys.turnWorkPages>,
        TimelinePageAnchor
    >({
        queryKey: timelineQueryKeys.turnWorkPages(
            threadId ?? '__inactive_thread__',
            turnId ?? '__inactive_turn__',
        ),
        enabled: queryEnabled,
        initialPageParam: initialAnchor,
        queryFn: async ({ pageParam, signal }) => {
            throwIfTimelineQueryAborted(signal);

            if (!threadId || !turnId) {
                throw new PioneerClientNativeError(
                    'turn work query requires threadId and turnId',
                    TIMELINE_FFI_ERROR_CODES.validation,
                );
            }

            const page = await pioneerClient.turnWorkPage({
                threadId,
                turnId,
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
    const items = useMemo(() => flattenTurnWorkItems(pages), [pages]);
    const latestWork = pages.at(-1)?.work ?? work ?? null;

    return {
        ...query,
        items,
        pages,
        work: latestWork,
        hasLoadedPage: pages.length > 0,
    };
};

export const flattenTurnWorkItems = (
    pages: readonly TurnWorkPageResponse[],
): TurnWorkItem[] => {
    const itemsById = new Map<string, TurnWorkItem>();

    for (const page of pages) {
        for (const item of page.items ?? []) {
            itemsById.set(item.workItemId, item);
        }
    }

    return Array.from(itemsById.values()).sort((left, right) =>
        left.orderKey.localeCompare(right.orderKey) ||
        left.workItemId.localeCompare(right.workItemId),
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

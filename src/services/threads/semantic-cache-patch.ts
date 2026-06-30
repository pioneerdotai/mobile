import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type {
    ClientActiveThreadEventResult,
    ThreadTimelinePageResponse,
    TimelineBlock,
    TurnWorkBlock,
    TurnWorkItem,
    TurnWorkPageResponse,
} from '@/client';
import {
    DEFAULT_THREAD_TIMELINE_PAGE_LIMIT,
    DEFAULT_TURN_WORK_PAGE_LIMIT,
    timelineQueryKeys,
} from '@/services/threads/timeline-query';

type SemanticTimelineCachePatch = ClientActiveThreadEventResult['semantic_timeline_patch'];
type ThreadTimelineData = InfiniteData<ThreadTimelinePageResponse, unknown>;
type TurnWorkData = InfiniteData<TurnWorkPageResponse, unknown>;
type RemovedWorkItem = NonNullable<SemanticTimelineCachePatch['removed_work_items']>[number];

const emptyPageInfo = {
    beforeCursor: null,
    afterCursor: null,
    hasMoreBefore: false,
    hasMoreAfter: false,
};

export const applySemanticTimelinePatchToCache = (
    queryClient: QueryClient,
    patch: SemanticTimelineCachePatch | null | undefined,
) => {
    if (!patch) {
        return;
    }

    const changedBlocks = patch.changed_blocks ?? [];
    const removedBlockIds = patch.removed_block_ids ?? [];
    const changedWorkItems = patch.changed_work_items ?? [];
    const removedWorkItems = patch.removed_work_items ?? [];

    if (changedBlocks.length > 0 || removedBlockIds.length > 0) {
        applyThreadBlockPatch(
            queryClient,
            patch.workspace_id,
            patch.thread_id,
            changedBlocks,
            removedBlockIds,
        );
    }

    const workBlocksByTurn = changedBlocks.reduce((acc, block) => {
        if (block.kind.kind === 'turn_work') {
            acc.set(block.kind.work.turnId, block.kind.work);
        }
        return acc;
    }, new Map<string, TurnWorkBlock>());

    for (const [turnId, work] of workBlocksByTurn) {
        applyTurnWorkStatePatch(queryClient, patch.thread_id, turnId, work);
    }

    if (changedWorkItems.length > 0 || removedWorkItems.length > 0) {
        applyTurnWorkItemsPatch(
            queryClient,
            patch.workspace_id,
            patch.thread_id,
            changedWorkItems,
            removedWorkItems,
            workBlocksByTurn,
        );
    }
};

const applyThreadBlockPatch = (
    queryClient: QueryClient,
    workspaceId: string,
    threadId: string,
    changedBlocks: readonly TimelineBlock[],
    removedBlockIds: readonly string[],
) => {
    const updateThreadTimelineData = (data: ThreadTimelineData | undefined): ThreadTimelineData => {
        const page = data?.pages[0] ?? emptyThreadTimelinePage(workspaceId, threadId);
        const pageParams = data?.pageParams?.length ? data.pageParams : [{ kind: 'newest' }];
        const removed = new Set(removedBlockIds);
        const byId = new Map(
            (page.blocks ?? [])
                .filter((block) => !removed.has(block.blockId))
                .map((block) => [block.blockId, block]),
        );

        for (const block of changedBlocks) {
            byId.set(block.blockId, block);
        }

        return {
            pages: [
                {
                    ...page,
                    workspaceId: page.workspaceId || workspaceId,
                    threadId,
                    blocks: sortBlocks(Array.from(byId.values())),
                },
                ...(data?.pages.slice(1) ?? []),
            ],
            pageParams,
        };
    };

    queryClient.setQueriesData<ThreadTimelineData>(
        { queryKey: timelineQueryKeys.threadPages(threadId) },
        updateThreadTimelineData,
    );

    const defaultQueryKey = timelineQueryKeys.threadPagesForLimit(
        threadId,
        DEFAULT_THREAD_TIMELINE_PAGE_LIMIT,
    );
    if (!queryClient.getQueryData<ThreadTimelineData>(defaultQueryKey)) {
        queryClient.setQueryData<ThreadTimelineData>(defaultQueryKey, updateThreadTimelineData);
    }
};

const applyTurnWorkStatePatch = (
    queryClient: QueryClient,
    threadId: string,
    turnId: string,
    work: TurnWorkBlock,
) => {
    queryClient.setQueriesData<TurnWorkData>(
        { queryKey: timelineQueryKeys.turnWork(threadId, turnId) },
        (data) => {
            if (!data) {
                return data;
            }

            return {
                ...data,
                pages: data.pages.map((page) => ({
                    ...page,
                    work,
                })),
            };
        },
    );
};

const applyTurnWorkItemsPatch = (
    queryClient: QueryClient,
    workspaceId: string,
    threadId: string,
    changedItems: readonly TurnWorkItem[],
    removedItems: readonly RemovedWorkItem[],
    workBlocksByTurn: ReadonlyMap<string, TurnWorkBlock>,
) => {
    const turnIds = new Set([
        ...changedItems.map((item) => item.turnId),
        ...removedItems.map((item) => item.turn_id),
    ]);

    for (const turnId of turnIds) {
        const updateTurnWorkData = (data: TurnWorkData | undefined): TurnWorkData | undefined => {
            if (!data) {
                const work = workBlocksByTurn.get(turnId);
                if (!work) {
                    return data;
                }

                data = {
                    pages: [emptyTurnWorkPage(workspaceId, threadId, turnId, work)],
                    pageParams: [{ kind: 'newest' }],
                };
            }

            const removed = new Set(
                removedItems
                    .filter((item) => item.turn_id === turnId)
                    .map((item) => item.work_item_id),
            );
            const changedForTurn = changedItems.filter((item) => item.turnId === turnId);
            const targetPageByWorkItemId = new Map<string, number>();
            data.pages.forEach((page, pageIndex) => {
                for (const item of page.items ?? []) {
                    targetPageByWorkItemId.set(item.workItemId, pageIndex);
                }
            });

            return {
                ...data,
                pages: data.pages.map((page, pageIndex) => {
                    const byId = new Map(
                        (page.items ?? [])
                            .filter((item) => !removed.has(item.workItemId))
                            .map((item) => [item.workItemId, item]),
                    );
                    for (const item of changedForTurn) {
                        const targetPage = targetPageByWorkItemId.get(item.workItemId) ?? 0;
                        if (targetPage === pageIndex) {
                            byId.set(item.workItemId, item);
                        }
                    }

                    return {
                        ...page,
                        items: sortWorkItems(Array.from(byId.values())),
                    };
                }),
            };
        };

        queryClient.setQueriesData<TurnWorkData>(
            { queryKey: timelineQueryKeys.turnWork(threadId, turnId) },
            updateTurnWorkData,
        );

        const defaultQueryKey = timelineQueryKeys.turnWorkPagesForLimit(
            threadId,
            turnId,
            DEFAULT_TURN_WORK_PAGE_LIMIT,
        );
        if (
            workBlocksByTurn.has(turnId) &&
            !queryClient.getQueryData<TurnWorkData>(defaultQueryKey)
        ) {
            queryClient.setQueryData<TurnWorkData>(defaultQueryKey, updateTurnWorkData);
        }
    }
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

const emptyTurnWorkPage = (
    workspaceId: string,
    threadId: string,
    turnId: string,
    work: TurnWorkBlock,
): TurnWorkPageResponse => ({
    workspaceId,
    threadId,
    turnId,
    projectionVersion: 0,
    work,
    items: [],
    page: emptyPageInfo,
});

const sortBlocks = (blocks: TimelineBlock[]): TimelineBlock[] =>
    blocks.sort(
        (left, right) =>
            left.sortKey.localeCompare(right.sortKey) || left.blockId.localeCompare(right.blockId),
    );

const sortWorkItems = (items: TurnWorkItem[]): TurnWorkItem[] =>
    items.sort(
        (left, right) =>
            left.orderKey.localeCompare(right.orderKey) ||
            left.workItemId.localeCompare(right.workItemId),
    );

import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { SemanticTimelineCachePatch } from '@/client/generated/client_active_thread_event_result';
import type {
    ThreadTimelinePageResponse,
    TimelineBlock,
    TimelinePageAnchor,
    TurnWorkBlock,
    TurnWorkItem,
    TurnWorkPageResponse,
} from '@/client';
import { protocolKeyCompare } from '@/services/threads/protocol-key-order';
import {
    DEFAULT_THREAD_TIMELINE_PAGE_LIMIT,
    timelineQueryKeys,
} from '@/services/threads/timeline-query';
import { newerTurnWorkItem, type TurnWorkInfiniteData } from './turn-work-cache';

type ThreadTimelineData = InfiniteData<ThreadTimelinePageResponse, TimelinePageAnchor>;

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

export const applySemanticTimelineCachePatch = (
    queryClient: QueryClient,
    patch: SemanticTimelineCachePatch,
): void => {
    if (!patch.thread_id) {
        return;
    }

    patchThreadTimelineQueries(queryClient, patch);
    patchTurnWorkQueries(queryClient, patch);
};

const patchThreadTimelineQueries = (
    queryClient: QueryClient,
    patch: SemanticTimelineCachePatch,
) => {
    const changedById = new Map(
        (patch.changed_blocks ?? []).map((block) => [block.blockId, block]),
    );
    const removedIds = new Set(patch.removed_block_ids ?? []);
    for (const blockId of removedIds) {
        changedById.delete(blockId);
    }
    if (changedById.size === 0 && removedIds.size === 0) {
        return;
    }

    queryClient.setQueriesData<ThreadTimelineData>(
        { queryKey: timelineQueryKeys.threadPages(patch.thread_id) },
        (data) => patchThreadTimelineData(data, changedById, removedIds),
    );
};

const patchThreadTimelineData = (
    data: ThreadTimelineData | undefined,
    changedById: ReadonlyMap<string, TimelineBlock>,
    removedIds: ReadonlySet<string>,
): ThreadTimelineData | undefined => {
    if (!data || data.pages.length === 0) {
        return data;
    }

    const seenChangedIds = new Set<string>();
    let changed = false;
    let pages = data.pages.map((page) => {
        let pageChanged = false;
        const blocks: TimelineBlock[] = [];
        for (const block of page.blocks ?? []) {
            if (removedIds.has(block.blockId)) {
                pageChanged = true;
                continue;
            }
            const incoming = changedById.get(block.blockId);
            if (incoming) {
                blocks.push(incoming);
                seenChangedIds.add(block.blockId);
                pageChanged ||= incoming !== block;
            } else {
                blocks.push(block);
            }
        }
        if (!pageChanged) {
            return page;
        }
        changed = true;
        blocks.sort(compareTimelineBlocks);
        return { ...page, blocks };
    });

    const missingChanged = Array.from(changedById.entries())
        .filter(([blockId]) => !seenChangedIds.has(blockId))
        .map(([, block]) => block);
    if (missingChanged.length > 0) {
        const newestPageIndex = newestLoadedPageIndex(pages, data.pageParams);
        if (newestPageIndex !== null) {
            const newestPage = pages[newestPageIndex];
            pages = pages.slice();
            const blocks = [...(newestPage.blocks ?? []), ...missingChanged];
            blocks.sort(compareTimelineBlocks);
            pages[newestPageIndex] = { ...newestPage, blocks };
            changed = true;
        }
    }

    return changed ? { ...data, pages } : data;
};

const patchTurnWorkQueries = (queryClient: QueryClient, patch: SemanticTimelineCachePatch) => {
    const changedWorkByTurn = new Map<string, TurnWorkBlock>();
    for (const block of patch.changed_blocks ?? []) {
        if (block.kind.kind === 'turn_work') {
            changedWorkByTurn.set(block.kind.work.turnId, block.kind.work);
        }
    }
    const removedWorkTurnIds = new Set(
        (patch.removed_block_ids ?? [])
            .map(turnIdFromWorkBlockId)
            .filter((turnId): turnId is string => turnId !== null),
    );
    const changedItemsByTurn = new Map<string, TurnWorkItem[]>();
    for (const item of patch.changed_work_items ?? []) {
        const items = changedItemsByTurn.get(item.turnId) ?? [];
        items.push(item);
        changedItemsByTurn.set(item.turnId, items);
    }
    const removedItemsByTurn = new Map<string, Set<string>>();
    for (const item of patch.removed_work_items ?? []) {
        const items = removedItemsByTurn.get(item.turn_id) ?? new Set<string>();
        items.add(item.work_item_id);
        removedItemsByTurn.set(item.turn_id, items);
    }

    const turnIds = new Set([
        ...changedWorkByTurn.keys(),
        ...removedWorkTurnIds,
        ...changedItemsByTurn.keys(),
        ...removedItemsByTurn.keys(),
    ]);
    for (const turnId of turnIds) {
        const changedItems = changedItemsByTurn.get(turnId) ?? [];
        const removedItemIds = removedItemsByTurn.get(turnId) ?? new Set<string>();
        const workPatch = removedWorkTurnIds.has(turnId)
            ? ({ kind: 'removed' } as const)
            : changedWorkByTurn.has(turnId)
              ? ({ kind: 'changed', work: changedWorkByTurn.get(turnId)! } as const)
              : ({ kind: 'unchanged' } as const);
        queryClient.setQueriesData<TurnWorkInfiniteData>(
            { queryKey: timelineQueryKeys.turnWorkPages(patch.thread_id, turnId) },
            (data) => patchTurnWorkData(data, changedItems, removedItemIds, workPatch),
        );
    }
};

type TurnWorkStatePatch =
    { kind: 'unchanged' } | { kind: 'changed'; work: TurnWorkBlock } | { kind: 'removed' };

const patchTurnWorkData = (
    data: TurnWorkInfiniteData | undefined,
    changedItems: readonly TurnWorkItem[],
    removedItemIds: ReadonlySet<string>,
    workPatch: TurnWorkStatePatch,
): TurnWorkInfiniteData | undefined => {
    if (!data || data.pages.length === 0) {
        return data;
    }

    const incomingById = new Map(changedItems.map((item) => [item.workItemId, item]));
    for (const workItemId of removedItemIds) {
        incomingById.delete(workItemId);
    }
    const seenIncomingIds = new Set<string>();
    let changed = false;
    let pages = data.pages.map((page) => {
        let pageChanged = false;
        const items: TurnWorkItem[] = [];
        for (const item of page.items ?? []) {
            if (removedItemIds.has(item.workItemId)) {
                pageChanged = true;
                continue;
            }
            const incoming = incomingById.get(item.workItemId);
            if (incoming) {
                const selected = newerTurnWorkItem(item, incoming);
                items.push(selected);
                seenIncomingIds.add(item.workItemId);
                pageChanged ||= selected !== item;
            } else {
                items.push(item);
            }
        }
        if (!pageChanged) {
            return page;
        }
        changed = true;
        items.sort(compareTurnWorkItems);
        return { ...page, items };
    });

    if (workPatch.kind !== 'unchanged') {
        pages = pages.map((page) => {
            const work = workPatch.kind === 'changed' ? workPatch.work : null;
            const items = workPatch.kind === 'removed' ? [] : page.items;
            if (page.work === work && items === page.items) {
                return page;
            }
            changed = true;
            return { ...page, work, items };
        });
    }

    const missingIncoming = Array.from(incomingById.entries())
        .filter(([workItemId]) => !seenIncomingIds.has(workItemId))
        .map(([, item]) => item);
    if (workPatch.kind !== 'removed' && missingIncoming.length > 0) {
        const newestPageIndex = newestLoadedPageIndex(pages, data.pageParams);
        if (newestPageIndex !== null) {
            const newestPage = pages[newestPageIndex];
            pages = pages.slice();
            const items = [...(newestPage.items ?? []), ...missingIncoming];
            items.sort(compareTurnWorkItems);
            pages[newestPageIndex] = { ...newestPage, items };
            changed = true;
        }
    }

    return changed ? { ...data, pages } : data;
};

const newestLoadedPageIndex = (
    pages: readonly (ThreadTimelinePageResponse | TurnWorkPageResponse)[],
    pageParams: readonly TimelinePageAnchor[],
): number | null => {
    const index = pageParams.findIndex((anchor) => anchor.kind === 'newest');
    if (index >= 0) {
        return index;
    }
    const newestBoundaryIndex = pages.findIndex((page) => !page.page.hasMoreAfter);
    return newestBoundaryIndex >= 0 ? newestBoundaryIndex : null;
};

const turnIdFromWorkBlockId = (blockId: string): string | null => {
    const prefix = 'turn:';
    const suffix = ':work';
    if (!blockId.startsWith(prefix) || !blockId.endsWith(suffix)) {
        return null;
    }
    const turnId = blockId.slice(prefix.length, -suffix.length);
    return turnId.length > 0 ? turnId : null;
};

const compareTimelineBlocks = (left: TimelineBlock, right: TimelineBlock): number =>
    protocolKeyCompare(left.sortKey, right.sortKey) ||
    protocolKeyCompare(left.blockId, right.blockId);

const compareTurnWorkItems = (left: TurnWorkItem, right: TurnWorkItem): number =>
    protocolKeyCompare(left.orderKey, right.orderKey) ||
    protocolKeyCompare(left.workItemId, right.workItemId);

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

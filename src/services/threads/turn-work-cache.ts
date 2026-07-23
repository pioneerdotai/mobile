import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type {
    TimelinePageAnchor,
    TurnWorkBlock,
    TurnWorkItem,
    TurnWorkItemsGetResponse,
    TurnWorkPageResponse,
} from '@/client';

import { protocolKeyCompare } from './protocol-key-order';
import { timelineQueryKeys } from './timeline-query';

type ProjectionRevision = readonly [sourceHighWatermark: number, updatedAtUnixMicros: number];
type WorkItemTombstones = Readonly<Record<string, ProjectionRevision>>;
export type TurnWorkInfiniteData = InfiniteData<TurnWorkPageResponse, TimelinePageAnchor> & {
    workItemTombstones?: WorkItemTombstones;
};

const projectionRevision = (
    value: Pick<
        TurnWorkPageResponse | TurnWorkItemsGetResponse,
        'sourceHighWatermark' | 'projectionUpdatedAtUnixMicros'
    >,
): ProjectionRevision => [value.sourceHighWatermark ?? 0, value.projectionUpdatedAtUnixMicros ?? 0];

const itemRevision = (item: TurnWorkItem): ProjectionRevision => [
    item.sourceSequence ?? 0,
    item.sourceUpdatedAtUnixMicros ?? 0,
];

const compareRevision = (left: ProjectionRevision, right: ProjectionRevision): number =>
    left[0] - right[0] || left[1] - right[1];

const isTerminalWorkItem = (item: TurnWorkItem): boolean => item.status !== 'running';

export const newerTurnWorkItem = (existing: TurnWorkItem, incoming: TurnWorkItem): TurnWorkItem => {
    if (isTerminalWorkItem(existing) && incoming.status === 'running') {
        return existing;
    }

    return compareRevision(itemRevision(incoming), itemRevision(existing)) >= 0
        ? incoming
        : existing;
};

export const flattenTurnWorkItems = (pages: readonly TurnWorkPageResponse[]): TurnWorkItem[] => {
    const itemsByWorkItemId = new Map<string, TurnWorkItem>();

    for (const page of pages) {
        for (const item of page.items ?? []) {
            const existing = itemsByWorkItemId.get(item.workItemId);
            itemsByWorkItemId.set(
                item.workItemId,
                existing ? newerTurnWorkItem(existing, item) : item,
            );
        }
    }

    const itemsByNativeItemId = new Map<string, TurnWorkItem>();
    for (const item of itemsByWorkItemId.values()) {
        const existing = itemsByNativeItemId.get(item.itemId);
        itemsByNativeItemId.set(item.itemId, existing ? newerTurnWorkItem(existing, item) : item);
    }

    return Array.from(itemsByNativeItemId.values()).sort(
        (left, right) =>
            protocolKeyCompare(left.orderKey, right.orderKey) ||
            protocolKeyCompare(left.workItemId, right.workItemId),
    );
};

const timelineAnchorKey = (anchor: TimelinePageAnchor): string => {
    if (anchor.kind === 'newest' || anchor.kind === 'oldest') {
        return anchor.kind;
    }
    return `${anchor.kind}:${anchor.cursor.value}`;
};

const mergeWorkItemTombstones = (
    existing: WorkItemTombstones | undefined,
    incoming: WorkItemTombstones | undefined,
): WorkItemTombstones => {
    const merged: Record<string, ProjectionRevision> = { ...existing };
    for (const [workItemId, revision] of Object.entries(incoming ?? {})) {
        const current = merged[workItemId];
        if (!current || compareRevision(revision, current) > 0) {
            merged[workItemId] = revision;
        }
    }
    return merged;
};

const pageItemSurvivesTombstone = (
    page: TurnWorkPageResponse,
    item: TurnWorkItem,
    tombstones: WorkItemTombstones,
): boolean => {
    const tombstone = tombstones[item.workItemId];
    return !tombstone || compareRevision(projectionRevision(page), tombstone) > 0;
};

const mergeTurnWorkPage = (
    existing: TurnWorkPageResponse,
    incoming: TurnWorkPageResponse,
    tombstones: WorkItemTombstones,
): TurnWorkPageResponse => {
    const incomingIsCurrent =
        compareRevision(projectionRevision(incoming), projectionRevision(existing)) >= 0;
    const itemsById = new Map(
        (existing.items ?? [])
            .filter((item) => pageItemSurvivesTombstone(existing, item, tombstones))
            .map((item) => [item.workItemId, item]),
    );

    for (const item of incoming.items ?? []) {
        if (!pageItemSurvivesTombstone(incoming, item, tombstones)) {
            continue;
        }
        const existingItem = itemsById.get(item.workItemId);
        if (existingItem) {
            itemsById.set(item.workItemId, newerTurnWorkItem(existingItem, item));
        } else if (incomingIsCurrent) {
            itemsById.set(item.workItemId, item);
        }
    }

    const merged = incomingIsCurrent ? incoming : existing;
    return {
        ...merged,
        items: Array.from(itemsById.values()),
    };
};

export const mergeTurnWorkInfiniteData = (
    existing: TurnWorkInfiniteData | undefined,
    incoming: TurnWorkInfiniteData,
): TurnWorkInfiniteData => {
    if (!existing) {
        return incoming;
    }

    const workItemTombstones = mergeWorkItemTombstones(
        existing.workItemTombstones,
        incoming.workItemTombstones,
    );
    const existingPages = new Map(
        existing.pageParams.map((anchor, index) => [
            timelineAnchorKey(anchor),
            existing.pages[index],
        ]),
    );
    const seenPageKeys = new Set<string>();
    const pages = incoming.pages.map((page, index) => {
        const pageKey = timelineAnchorKey(incoming.pageParams[index] ?? { kind: 'newest' });
        seenPageKeys.add(pageKey);
        const existingPage = existingPages.get(pageKey);
        return existingPage
            ? mergeTurnWorkPage(existingPage, page, workItemTombstones)
            : {
                  ...page,
                  items: (page.items ?? []).filter((item) =>
                      pageItemSurvivesTombstone(page, item, workItemTombstones),
                  ),
              };
    });
    const pageParams = incoming.pageParams.slice();

    for (let index = 0; index < existing.pageParams.length; index += 1) {
        const anchor = existing.pageParams[index];
        const pageKey = timelineAnchorKey(anchor);
        const page = existing.pages[index];
        if (!seenPageKeys.has(pageKey) && page) {
            pageParams.push(anchor);
            pages.push({
                ...page,
                items: (page.items ?? []).filter((item) =>
                    pageItemSurvivesTombstone(page, item, workItemTombstones),
                ),
            });
        }
    }

    return { ...incoming, pages, pageParams, workItemTombstones };
};

export const latestTurnWorkBlock = (
    pages: readonly TurnWorkPageResponse[],
    fallback: TurnWorkBlock | null,
): TurnWorkBlock | null => {
    if (fallback) {
        return fallback;
    }

    let latest: TurnWorkPageResponse | null = null;
    for (const page of pages) {
        if (
            latest === null ||
            compareRevision(projectionRevision(page), projectionRevision(latest)) > 0
        ) {
            latest = page;
        }
    }
    return latest?.work ?? null;
};

export const applyTurnWorkItemsGetResponse = (
    data: TurnWorkInfiniteData | undefined,
    response: TurnWorkItemsGetResponse,
): TurnWorkInfiniteData | undefined => {
    if (!data || data.pages.length === 0) {
        return data;
    }

    const cachedRevision = data.pages.reduce<ProjectionRevision>(
        (latest, page) => {
            const revision = projectionRevision(page);
            return compareRevision(revision, latest) > 0 ? revision : latest;
        },
        [0, 0],
    );
    const responseRevision = projectionRevision(response);
    const canRemove = compareRevision(responseRevision, cachedRevision) >= 0;
    const removedIds = canRemove ? new Set(response.removedWorkItemIds ?? []) : new Set<string>();
    const workItemTombstones: Record<string, ProjectionRevision> = {
        ...data.workItemTombstones,
    };
    for (const workItemId of removedIds) {
        workItemTombstones[workItemId] = responseRevision;
    }
    const incomingById = new Map(
        (response.items ?? [])
            .filter((item) => {
                if (removedIds.has(item.workItemId)) {
                    return false;
                }
                const tombstone = workItemTombstones[item.workItemId];
                if (tombstone && compareRevision(responseRevision, tombstone) < 0) {
                    return false;
                }
                delete workItemTombstones[item.workItemId];
                return true;
            })
            .map((item) => [item.workItemId, item]),
    );
    const seenIncomingIds = new Set<string>();
    let changed = false;

    let pages = data.pages.map((page) => {
        let pageChanged = false;
        const items: TurnWorkItem[] = [];
        for (const existing of page.items ?? []) {
            if (removedIds.has(existing.workItemId)) {
                pageChanged = true;
                continue;
            }

            const incoming = incomingById.get(existing.workItemId);
            if (!incoming) {
                items.push(existing);
                continue;
            }

            seenIncomingIds.add(existing.workItemId);
            const selected = newerTurnWorkItem(existing, incoming);
            items.push(selected);
            pageChanged ||= selected !== existing;
        }

        if (!pageChanged) {
            return page;
        }
        changed = true;
        return { ...page, items };
    });

    const newestPageIndex = Math.max(
        0,
        data.pageParams.findIndex((anchor) => anchor.kind === 'newest'),
    );
    const missingItems = Array.from(incomingById.values()).filter(
        (item) => !seenIncomingIds.has(item.workItemId),
    );
    const newestPage = pages[newestPageIndex];
    if (newestPage && missingItems.length > 0) {
        pages = pages.slice();
        pages[newestPageIndex] = {
            ...newestPage,
            items: [...(newestPage.items ?? []), ...missingItems],
        };
        changed = true;
    }

    const revisedNewestPage = pages[newestPageIndex];
    if (
        revisedNewestPage &&
        compareRevision(responseRevision, projectionRevision(revisedNewestPage)) >= 0 &&
        (revisedNewestPage.sourceHighWatermark !== response.sourceHighWatermark ||
            revisedNewestPage.projectionUpdatedAtUnixMicros !==
                response.projectionUpdatedAtUnixMicros)
    ) {
        if (pages === data.pages) {
            pages = pages.slice();
        }
        pages[newestPageIndex] = {
            ...revisedNewestPage,
            sourceHighWatermark: response.sourceHighWatermark,
            projectionUpdatedAtUnixMicros: response.projectionUpdatedAtUnixMicros,
        };
        changed = true;
    }

    const tombstonesChanged =
        Object.keys(workItemTombstones).length !==
            Object.keys(data.workItemTombstones ?? {}).length ||
        Object.entries(workItemTombstones).some(
            ([workItemId, revision]) =>
                compareRevision(revision, data.workItemTombstones?.[workItemId] ?? [0, 0]) !== 0,
        );

    return changed || tombstonesChanged ? { ...data, pages, workItemTombstones } : data;
};

export const patchTurnWorkItemsQueries = (
    queryClient: QueryClient,
    response: TurnWorkItemsGetResponse,
): void => {
    queryClient.setQueriesData<TurnWorkInfiniteData>(
        {
            queryKey: timelineQueryKeys.turnWorkPages(response.threadId, response.turnId),
        },
        (data) => applyTurnWorkItemsGetResponse(data, response),
    );
};

export const cachedTurnWorkItemIdsByTurn = (
    queryClient: QueryClient,
    threadId: string,
): Map<string, string[]> => {
    const idsByTurn = new Map<string, Set<string>>();
    for (const [, data] of queryClient.getQueriesData<TurnWorkInfiniteData>({
        queryKey: timelineQueryKeys.thread(threadId),
    })) {
        for (const page of data?.pages ?? []) {
            if (page.threadId !== threadId) {
                continue;
            }
            for (const item of page.items ?? []) {
                const ids = idsByTurn.get(page.turnId) ?? new Set<string>();
                ids.add(item.workItemId);
                idsByTurn.set(page.turnId, ids);
            }
        }
    }

    return new Map(Array.from(idsByTurn, ([turnId, ids]) => [turnId, Array.from(ids).sort()]));
};

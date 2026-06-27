import type { TimelineRow } from '@/services/threads/conversation/timeline';

export type TimelineTurnWorkBoundaryHint = {
    key: string;
    turnId: string;
    visible: boolean;
    nearStart: boolean;
    nearEnd: boolean;
};

export type TimelineViewportPrefetchPlan = {
    key: string;
    start: number;
    end: number;
    nearStart: boolean;
    nearEnd: boolean;
    turnWork: Record<string, TimelineTurnWorkBoundaryHint>;
};

const TIMELINE_PREFETCH_THRESHOLD_ROWS = 6;

export const viewportPrefetchPlan = (
    rows: readonly TimelineRow[],
    visibleIndices: readonly number[],
    fallbackStart: number,
    fallbackEnd: number,
): TimelineViewportPrefetchPlan | null => {
    if (rows.length === 0) {
        return null;
    }

    const normalizedVisibleIndices =
        visibleIndices.length > 0
            ? visibleIndices
            : [clampIndex(fallbackStart, rows.length), clampIndex(fallbackEnd, rows.length)];
    const start = Math.min(...normalizedVisibleIndices);
    const end = Math.max(...normalizedVisibleIndices);
    const nearStart = start <= TIMELINE_PREFETCH_THRESHOLD_ROWS;
    const nearEnd = end >= rows.length - 1 - TIMELINE_PREFETCH_THRESHOLD_ROWS;
    const visibleWorkTurnIds = new Set<string>();
    const workSpans = new Map<string, { start: number; end: number }>();

    rows.forEach((row, index) => {
        const turnId = semanticWorkItemTurnId(row);
        if (!turnId) {
            return;
        }

        const span = workSpans.get(turnId);
        if (!span) {
            workSpans.set(turnId, { start: index, end: index });
            return;
        }

        span.end = index;
    });

    for (const index of normalizedVisibleIndices) {
        const row = rows[index];
        const turnId = row ? semanticWorkItemTurnId(row) : null;
        if (turnId) {
            visibleWorkTurnIds.add(turnId);
        }
    }

    const turnWork = Array.from(visibleWorkTurnIds).reduce<
        Record<string, TimelineTurnWorkBoundaryHint>
    >((acc, turnId) => {
        const span = workSpans.get(turnId);
        if (!span) {
            return acc;
        }

        const visibleForTurn = normalizedVisibleIndices.filter((index) => {
            const row = rows[index];
            return row ? semanticWorkItemTurnId(row) === turnId : false;
        });

        if (visibleForTurn.length === 0) {
            return acc;
        }

        const visibleStart = Math.min(...visibleForTurn);
        const visibleEnd = Math.max(...visibleForTurn);
        const turnNearStart = visibleStart <= span.start + TIMELINE_PREFETCH_THRESHOLD_ROWS;
        const turnNearEnd = visibleEnd >= span.end - TIMELINE_PREFETCH_THRESHOLD_ROWS;

        acc[turnId] = {
            key: `${turnId}:${visibleStart}:${visibleEnd}:${turnNearStart ? 'S' : '-'}:${turnNearEnd ? 'E' : '-'}`,
            turnId,
            visible: true,
            nearStart: turnNearStart,
            nearEnd: turnNearEnd,
        };
        return acc;
    }, {});

    return {
        key: `${start}:${end}:${nearStart ? 'S' : '-'}:${nearEnd ? 'E' : '-'}:${Object.values(
            turnWork,
        )
            .map((hint) => hint.key)
            .join('|')}`,
        start,
        end,
        nearStart,
        nearEnd,
        turnWork,
    };
};

const semanticWorkItemTurnId = (row: TimelineRow): string | null => {
    if (!row.semanticWorkItem) {
        return null;
    }

    return timelineRowTurnId(row);
};

const timelineRowTurnId = (row: TimelineRow) => ('turnId' in row ? (row.turnId ?? null) : null);

const clampIndex = (index: number, rowCount: number) => {
    if (!Number.isFinite(index)) {
        return 0;
    }

    return Math.min(Math.max(Math.floor(index), 0), Math.max(rowCount - 1, 0));
};

import type { TimelineRow } from '@/services/threads/conversation/timeline';

export const timelineRowsAreEqual = (previous: TimelineRow, next: TimelineRow): boolean => {
    if (previous === next) {
        return true;
    }

    if (previous.key !== next.key || previous.type !== next.type) {
        return false;
    }

    if (
        !previous.renderFingerprint ||
        !next.renderFingerprint ||
        previous.renderFingerprint !== next.renderFingerprint
    ) {
        return false;
    }

    return (
        rowItemId(previous) === rowItemId(next) &&
        rowTurnId(previous) === rowTurnId(next) &&
        rowStartedAt(previous) === rowStartedAt(next) &&
        rowElapsedLabel(previous) === rowElapsedLabel(next) &&
        rowTimestampLabel(previous) === rowTimestampLabel(next)
    );
};

const rowItemId = (row: TimelineRow): string | null =>
    'itemId' in row ? (row.itemId ?? null) : null;

const rowTurnId = (row: TimelineRow): string | null =>
    'turnId' in row ? (row.turnId ?? null) : null;

const rowStartedAt = (row: TimelineRow): number | null => row.startedAtUnixMs ?? null;

const rowElapsedLabel = (row: TimelineRow): string | null =>
    'elapsedLabel' in row ? row.elapsedLabel : null;

const rowTimestampLabel = (row: TimelineRow): string | null =>
    'timestampLabel' in row ? row.timestampLabel : null;

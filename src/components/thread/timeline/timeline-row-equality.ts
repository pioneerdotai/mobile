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
        rowDisplayedIdentity(previous) === rowDisplayedIdentity(next) &&
        rowTurnId(previous) === rowTurnId(next) &&
        rowElapsedLabel(previous) === rowElapsedLabel(next) &&
        rowTimestampLabel(previous) === rowTimestampLabel(next)
    );
};

const rowDisplayedIdentity = (row: TimelineRow): string | null =>
    row.type === 'unknown' ? (row.itemId ?? null) : null;

const rowTurnId = (row: TimelineRow): string | null =>
    'turnId' in row ? (row.turnId ?? null) : null;

const rowElapsedLabel = (row: TimelineRow): string | null =>
    'elapsedLabel' in row ? row.elapsedLabel : null;

const rowTimestampLabel = (row: TimelineRow): string | null =>
    'timestampLabel' in row ? row.timestampLabel : null;

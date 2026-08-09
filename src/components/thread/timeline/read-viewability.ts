import type { TimelineRow } from '@/services/threads/conversation/timeline';

export const viewedThroughLatestUserTurn = (
    rows: readonly TimelineRow[],
    visibleIndices: readonly number[],
): string | null => {
    let latestUserIndex = -1;
    for (let index = rows.length - 1; index >= 0; index -= 1) {
        if (rows[index]?.type === 'user-message') {
            latestUserIndex = index;
            break;
        }
    }
    if (latestUserIndex < 0 || !visibleIndices.some((index) => index >= latestUserIndex)) {
        return null;
    }
    const row = rows[latestUserIndex];
    return row?.type === 'user-message' ? row.turnId : null;
};

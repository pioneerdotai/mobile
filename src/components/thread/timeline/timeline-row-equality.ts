import isEqual from 'react-fast-compare';

import type { TimelineRow } from '@/services/threads/conversation/timeline';

export const timelineRowsAreEqual = (previous: TimelineRow, next: TimelineRow): boolean => {
    if (previous === next) {
        return true;
    }

    if (previous.key !== next.key || previous.type !== next.type) {
        return false;
    }

    return isEqual(previous, next);
};

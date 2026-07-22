import type { TimelineRow } from '@/services/threads/conversation/timeline';

export const defaultTimelineRowExpanded = (row: TimelineRow): boolean => {
    switch (row.type) {
        case 'reasoning':
        case 'command-execution':
        case 'file-change':
        case 'tool-call':
            return false;
        case 'work-group':
        case 'tool-group':
            return row.expanded;
        default:
            return false;
    }
};

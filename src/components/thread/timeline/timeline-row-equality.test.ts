import { describe, expect, it } from '@jest/globals';

import type { TimelineRow } from '@/services/threads/conversation/timeline';

import { timelineRowsAreEqual } from './timeline-row-equality';

const systemRow = (message: string): TimelineRow => ({
    type: 'system-event',
    key: 'system-event:item_a',
    itemId: 'item_a',
    turnId: 'turn_a',
    level: 'info',
    message,
    code: null,
    details: { source: 'gateway' },
    label: 'System event',
    capabilityRejections: [],
});

describe('timelineRowsAreEqual', () => {
    it('reuses a semantically unchanged row recreated by a paged snapshot', () => {
        expect(timelineRowsAreEqual(systemRow('Ready'), systemRow('Ready'))).toBe(true);
    });

    it('refreshes a row when its rendered content changes', () => {
        expect(timelineRowsAreEqual(systemRow('Running'), systemRow('Completed'))).toBe(false);
    });

    it('does not reuse different logical rows', () => {
        const previous = systemRow('Ready');
        const next = { ...systemRow('Ready'), key: 'system-event:item_b', itemId: 'item_b' };

        expect(timelineRowsAreEqual(previous, next)).toBe(false);
    });
});

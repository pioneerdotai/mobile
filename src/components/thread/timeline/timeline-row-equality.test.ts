import { describe, expect, it } from '@jest/globals';

import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { ensureTimelineRowRenderFingerprint } from '@/services/threads/conversation/render-fingerprint';

import { timelineRowsAreEqual } from './timeline-row-equality';

const systemRow = (message: string): TimelineRow =>
    ensureTimelineRowRenderFingerprint({
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

    it('refreshes a running row when only its local clock changes', () => {
        const previous = ensureTimelineRowRenderFingerprint(
            {
                type: 'running',
                key: 'running:turn_a',
                turnId: 'turn_a',
                startedAtUnixMs: 1_000,
                elapsedLabel: '1 sec',
                state: 'running',
                message: null,
                securitySummary: null,
            },
            'abc',
        );
        const next = { ...previous, elapsedLabel: '2 sec' };

        expect(timelineRowsAreEqual(previous, next)).toBe(false);
    });
});

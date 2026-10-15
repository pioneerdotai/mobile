import { describe, expect, it } from '@jest/globals';
import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { timelineRowsAreEqual } from './timeline-row-equality';

const row = (revision = 1): Extract<TimelineRow, { type: 'running' }> => ({
    type: 'running',
    key: 'running:turn_a',
    turnId: 'turn_a',
    presentationRevision: revision,
    startedAtUnixMs: 1000,
    elapsedLabel: '1 sec',
    state: 'running',
    message: null,
    author: null,
    securitySummary: null,
});
describe('timelineRowsAreEqual', () => {
    it('uses Client identity and revision for immutable content', () => {
        expect(timelineRowsAreEqual(row(), row())).toBe(true);
        expect(timelineRowsAreEqual(row(), row(2))).toBe(false);
        expect(timelineRowsAreEqual(row(), { ...row(), key: 'running:turn_b' })).toBe(false);
    });
    it('updates localized elapsed text independently of Client publication', () => {
        expect(timelineRowsAreEqual(row(), { ...row(), elapsedLabel: '2 sec' })).toBe(false);
    });
});

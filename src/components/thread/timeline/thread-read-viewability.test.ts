import { describe, expect, it } from '@jest/globals';

import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { viewedThroughLatestUserTurn, viewedTimelineRowIds } from './read-viewability';

const row = (type: TimelineRow['type'], turnId: string): TimelineRow =>
    ({ type, turnId, key: `${type}:${turnId}` }) as TimelineRow;

describe('mobile thread read viewability', () => {
    const rows = [
        row('user-message', 'turn_1'),
        row('assistant-message', 'turn_1'),
        row('user-message', 'turn_2'),
        row('assistant-message', 'turn_2'),
    ];

    it('does not mark the latest user Turn while the viewport is before it', () => {
        expect(viewedThroughLatestUserTurn(rows, [0, 1])).toBeNull();
    });

    it('marks the latest user Turn when the viewport reaches or passes it', () => {
        expect(viewedThroughLatestUserTurn(rows, [2])).toBe('turn_2');
        expect(viewedThroughLatestUserTurn(rows, [3])).toBe('turn_2');
    });

    it('does not invent a cursor for a timeline without a user Turn', () => {
        expect(viewedThroughLatestUserTurn([row('system-event', 'turn_1')], [0])).toBeNull();
    });
    it('reports the actual HTML-only answer row without inferring a later response', () => {
        const html = {
            ...row('assistant-message', 'turn_1'),
            key: 'html',
            text: '',
            htmlPublications: [{ id: 'html-1' }],
        } as unknown as TimelineRow;
        const second = { ...row('assistant-message', 'turn_1'), key: 'second' };
        const timeline = [rows[0], html, second];
        expect(viewedTimelineRowIds(timeline, [0])).toEqual([rows[0].key]);
        expect(viewedTimelineRowIds(timeline, [1, 1, -1, 100])).toEqual(['html']);
        expect(viewedTimelineRowIds(timeline, [])).toEqual([]);
    });
});

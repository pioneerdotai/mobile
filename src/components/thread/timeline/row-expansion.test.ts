import { describe, expect, it } from '@jest/globals';

import type { TimelineRow } from '@/services/threads/conversation/timeline';

import { defaultTimelineRowExpanded } from './row-expansion';

const row = (value: Record<string, unknown>): TimelineRow => value as TimelineRow;

describe('timeline row expansion defaults', () => {
    it('keeps running and completed work items collapsed', () => {
        for (const workItem of [
            row({ type: 'reasoning', streaming: true, collapsed: false }),
            row({ type: 'reasoning', streaming: false, collapsed: true }),
            row({ type: 'command-execution', status: 'Running' }),
            row({ type: 'command-execution', status: 'Completed' }),
            row({ type: 'file-change', status: 'Running' }),
            row({ type: 'file-change', status: 'Completed' }),
            row({ type: 'tool-call', status: 'Running' }),
            row({ type: 'tool-call', status: 'Completed' }),
        ]) {
            expect(defaultTimelineRowExpanded(workItem)).toBe(false);
        }
    });

    it('preserves the expansion default supplied by group rows', () => {
        expect(defaultTimelineRowExpanded(row({ type: 'work-group', expanded: true }))).toBe(true);
        expect(defaultTimelineRowExpanded(row({ type: 'work-group', expanded: false }))).toBe(
            false,
        );
        expect(defaultTimelineRowExpanded(row({ type: 'tool-group', expanded: true }))).toBe(true);
        expect(defaultTimelineRowExpanded(row({ type: 'tool-group', expanded: false }))).toBe(
            false,
        );
    });
});

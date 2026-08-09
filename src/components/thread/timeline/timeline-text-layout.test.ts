import { describe, expect, it } from '@jest/globals';

import { timelineTextBottomMargin } from './timeline-text-layout';

describe('timelineTextBottomMargin', () => {
    it('aligns the row edge with the visible text instead of the line box', () => {
        expect(timelineTextBottomMargin({ fontSize: 16, lineHeight: 24 })).toBe(-5);
    });
});

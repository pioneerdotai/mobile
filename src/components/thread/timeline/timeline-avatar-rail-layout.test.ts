import { describe, expect, it } from '@jest/globals';

import { calculateTimelineEndAlignmentPadding } from './timeline-avatar-rail-layout';

describe('calculateTimelineEndAlignmentPadding', () => {
    it('returns the leading spacer used to bottom-align a short timeline', () => {
        expect(
            calculateTimelineEndAlignmentPadding({
                scrollLength: 1_000,
                itemsEnd: 400,
                contentTopInset: 100,
                contentEndInset: 300,
            }),
        ).toBe(200);
    });

    it('does not offset a timeline that fills the viewport', () => {
        expect(
            calculateTimelineEndAlignmentPadding({
                scrollLength: 800,
                itemsEnd: 600,
                contentTopInset: 100,
                contentEndInset: 200,
            }),
        ).toBe(0);
    });

    it('ignores incomplete layout metrics', () => {
        expect(
            calculateTimelineEndAlignmentPadding({
                scrollLength: 0,
                itemsEnd: Number.NaN,
                contentTopInset: 100,
                contentEndInset: 200,
            }),
        ).toBe(0);
    });
});

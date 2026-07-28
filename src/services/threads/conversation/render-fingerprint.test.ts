import { describe, expect, it } from '@jest/globals';

import type { TimelineRow } from './timeline';

import {
    ensureTimelineRowRenderFingerprint,
    localTimelineRowRenderFingerprint,
} from './render-fingerprint';

const reasoningRow = (text: string): TimelineRow => ({
    type: 'reasoning',
    key: 'reasoning:item_a',
    itemId: 'item_a',
    turnId: 'turn_a',
    text,
    markdown: null,
    collapsed: false,
    streaming: true,
    elapsedLabel: '1 sec',
    startedAtUnixMs: 1_000,
});

describe('timeline row render fingerprints', () => {
    it('tracks rendered content but ignores the local elapsed clock', () => {
        const first = reasoningRow('analysis');
        const later = { ...first, elapsedLabel: '2 sec' };
        const changed = reasoningRow('different');

        expect(localTimelineRowRenderFingerprint(first)).toBe(
            localTimelineRowRenderFingerprint(later),
        );
        expect(localTimelineRowRenderFingerprint(first)).not.toBe(
            localTimelineRowRenderFingerprint(changed),
        );
    });

    it('prefers the fingerprint supplied by Rust', () => {
        expect(ensureTimelineRowRenderFingerprint(reasoningRow('analysis'), 'abc')).toMatchObject({
            renderFingerprint: 'rust:abc',
        });
    });
});

import { describe, expect, it } from '@jest/globals';

import {
    VOICE_INPUT_POLL_INTERVAL_MS,
    boundedVoiceInputError,
    voiceInputPollInterval,
    voiceInputProgress,
} from './presentation';

describe('Voice Input progress lifecycle', () => {
    it.each(['downloading', 'installing', 'loading'] as const)(
        'polls while phase is %s',
        (phase) => {
            expect(voiceInputPollInterval({ enabled: true, runtime: { phase } }, true)).toBe(
                VOICE_INPUT_POLL_INTERVAL_MS,
            );
        },
    );

    it.each(['disabled', 'model_not_selected', 'missing', 'ready', 'failed'] as const)(
        'does not poll terminal phase %s',
        (phase) => {
            expect(voiceInputPollInterval({ enabled: true, runtime: { phase } }, true)).toBe(false);
        },
    );

    it('stops polling immediately when disconnected', () => {
        expect(
            voiceInputPollInterval({ enabled: true, runtime: { phase: 'downloading' } }, false),
        ).toBe(false);
    });

    it('uses real known totals and clamps over-complete downloads', () => {
        expect(
            voiceInputProgress({
                enabled: true,
                runtime: { phase: 'downloading', downloaded_bytes: 25, total_bytes: 100 },
            }),
        ).toEqual({ kind: 'determinate', fraction: 0.25, percentage: 25 });
        expect(
            voiceInputProgress({
                enabled: true,
                runtime: { phase: 'downloading', downloaded_bytes: 120, total_bytes: 100 },
            }),
        ).toEqual({ kind: 'determinate', fraction: 1, percentage: 100 });
    });

    it('keeps unknown totals indeterminate instead of inventing progress', () => {
        expect(
            voiceInputProgress({
                enabled: true,
                runtime: { phase: 'downloading', downloaded_bytes: 25 },
            }),
        ).toEqual({ kind: 'indeterminate' });
        expect(voiceInputProgress({ enabled: true, runtime: { phase: 'installing' } })).toBeNull();
    });

    it('bounds Gateway error text before presentation', () => {
        expect(boundedVoiceInputError('  checksum failed  ')).toBe('checksum failed');
        expect(boundedVoiceInputError('x'.repeat(500))).toHaveLength(240);
        expect(boundedVoiceInputError('x'.repeat(500))?.endsWith('…')).toBe(true);
        expect(boundedVoiceInputError('   ')).toBeNull();
    });
});

import { describe, expect, it } from '@jest/globals';

import { resolveVoiceComposerAvailability } from './composer';

describe('active-Gateway Voice Input composer availability', () => {
    it('hides the microphone while the operational Gateway is offline', () => {
        expect(
            resolveVoiceComposerAvailability({
                online: false,
                voiceStatus: 'ready',
            }),
        ).toEqual({ kind: 'hidden' });
    });

    it('uses the operational status projection without requiring admin settings', () => {
        expect(
            resolveVoiceComposerAvailability({
                online: true,
                voiceStatus: 'ready',
            }),
        ).toEqual({ kind: 'ready' });

        for (const voiceStatus of [
            null,
            undefined,
            'disabled',
            'unavailable',
            'model_downloading',
            'model_loading',
            'busy',
            'recording',
            'transcribing',
            'error',
        ] as const) {
            expect(
                resolveVoiceComposerAvailability({
                    online: true,
                    voiceStatus,
                }),
            ).toEqual({ kind: 'hidden' });
        }
    });
});

import type { VoiceStatus } from '@/client';

export type VoiceComposerAvailability = Readonly<{ kind: 'hidden' }> | Readonly<{ kind: 'ready' }>;

type VoiceComposerAvailabilityInput = Readonly<{
    online: boolean;
    voiceStatus: VoiceStatus | null | undefined;
}>;

export const resolveVoiceComposerAvailability = ({
    online,
    voiceStatus,
}: VoiceComposerAvailabilityInput): VoiceComposerAvailability => {
    if (!online) {
        return { kind: 'hidden' };
    }

    // Composer use is authorized by voice/status. Gateway settings are an
    // administrative projection and are intentionally unavailable to Members.
    return voiceStatus === 'ready' ? { kind: 'ready' } : { kind: 'hidden' };
};

import type { GatewaySettingsGetResponse, VoiceStatus } from '@/client';
import { reduceVoiceInputStatus } from './query';

type VoiceInputSettings = GatewaySettingsGetResponse['settings']['voice_input'];

export type VoiceComposerAvailability = Readonly<{ kind: 'hidden' }> | Readonly<{ kind: 'ready' }>;

type VoiceComposerAvailabilityInput = Readonly<{
    online: boolean;
    settingsLoading: boolean;
    settingsError: boolean;
    settings: VoiceInputSettings;
    voiceStatus: VoiceStatus | null | undefined;
}>;

export const resolveVoiceComposerAvailability = ({
    online,
    settingsLoading,
    settingsError,
    settings,
    voiceStatus,
}: VoiceComposerAvailabilityInput): VoiceComposerAvailability => {
    if (!online) {
        return { kind: 'hidden' };
    }

    if (settingsLoading || settingsError || !settings) {
        return { kind: 'hidden' };
    }

    const reduction = reduceVoiceInputStatus(settings);
    if (reduction.presentation !== 'ready') {
        return { kind: 'hidden' };
    }

    return voiceStatus === 'ready' ? { kind: 'ready' } : { kind: 'hidden' };
};

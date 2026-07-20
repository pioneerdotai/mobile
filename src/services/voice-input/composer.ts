import type { GatewaySettingsGetResponse, VoiceStatus } from '@/client';
import { reduceVoiceInputStatus } from './query';
import { boundedVoiceInputError } from './presentation';

type VoiceInputSettings = GatewaySettingsGetResponse['settings']['voice_input'];

export type VoiceComposerBlockedReason =
    | 'model_not_selected'
    | 'missing'
    | 'downloading'
    | 'installing'
    | 'loading'
    | 'failed'
    | 'busy'
    | 'unavailable';

export type VoiceComposerAvailability =
    | Readonly<{ kind: 'hidden' }>
    | Readonly<{
          kind: 'blocked';
          reason: VoiceComposerBlockedReason;
          error: string | null;
      }>
    | Readonly<{ kind: 'ready' }>;

type VoiceComposerAvailabilityInput = Readonly<{
    online: boolean;
    settingsLoading: boolean;
    settingsError: boolean;
    settings: VoiceInputSettings;
    voiceStatus: VoiceStatus | null | undefined;
    voiceStatusError?: string | null;
}>;

export const resolveVoiceComposerAvailability = ({
    online,
    settingsLoading,
    settingsError,
    settings,
    voiceStatus,
    voiceStatusError,
}: VoiceComposerAvailabilityInput): VoiceComposerAvailability => {
    if (!online) {
        return { kind: 'hidden' };
    }

    if (settingsLoading || settingsError || !settings) {
        return { kind: 'hidden' };
    }

    const reduction = reduceVoiceInputStatus(settings);
    if (reduction.presentation === 'disabled') {
        return { kind: 'hidden' };
    }

    if (reduction.presentation === 'failed') {
        return {
            kind: 'blocked',
            reason: 'failed',
            error: boundedVoiceInputError(settings.runtime?.error),
        };
    }

    if (reduction.presentation !== 'ready') {
        const phase = reduction.phase;
        const reason: VoiceComposerBlockedReason =
            phase === 'model_not_selected' ||
            phase === 'missing' ||
            phase === 'downloading' ||
            phase === 'installing' ||
            phase === 'loading'
                ? phase
                : 'unavailable';
        return { kind: 'blocked', reason, error: null };
    }

    if (voiceStatus === 'ready') {
        return { kind: 'ready' };
    }

    if (voiceStatus === 'busy' || voiceStatus === 'recording' || voiceStatus === 'transcribing') {
        return { kind: 'blocked', reason: 'busy', error: null };
    }

    return {
        kind: 'blocked',
        reason: 'unavailable',
        error: boundedVoiceInputError(voiceStatusError),
    };
};

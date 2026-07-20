import type { GatewaySettingsGetResponse } from '@/client';

type VoiceInputSettings = GatewaySettingsGetResponse['settings']['voice_input'];

const MAX_VOICE_INPUT_ERROR_CHARS = 240;

export const VOICE_INPUT_POLL_INTERVAL_MS = 1_500;

export const voiceInputPollInterval = (
    settings: VoiceInputSettings,
    online: boolean,
): number | false => {
    if (!online) {
        return false;
    }

    switch (settings?.runtime?.phase) {
        case 'downloading':
        case 'installing':
        case 'loading':
            return VOICE_INPUT_POLL_INTERVAL_MS;
        default:
            return false;
    }
};

export type VoiceInputProgress =
    | Readonly<{ kind: 'indeterminate' }>
    | Readonly<{
          kind: 'determinate';
          fraction: number;
          percentage: number;
      }>;

export const voiceInputProgress = (settings: VoiceInputSettings): VoiceInputProgress | null => {
    const runtime = settings?.runtime;
    if (runtime?.phase !== 'downloading') {
        return null;
    }

    const downloaded = runtime.downloaded_bytes;
    const total = runtime.total_bytes;
    if (
        typeof downloaded !== 'number' ||
        !Number.isFinite(downloaded) ||
        downloaded < 0 ||
        typeof total !== 'number' ||
        !Number.isFinite(total) ||
        total <= 0
    ) {
        return { kind: 'indeterminate' };
    }

    const fraction = Math.min(Math.max(downloaded / total, 0), 1);
    return {
        kind: 'determinate',
        fraction,
        percentage: Math.round(fraction * 100),
    };
};

export const boundedVoiceInputError = (error: string | null | undefined): string | null => {
    const normalized = error?.trim();
    if (!normalized) {
        return null;
    }

    if (normalized.length <= MAX_VOICE_INPUT_ERROR_CHARS) {
        return normalized;
    }

    return `${normalized.slice(0, MAX_VOICE_INPUT_ERROR_CHARS - 1).trimEnd()}…`;
};

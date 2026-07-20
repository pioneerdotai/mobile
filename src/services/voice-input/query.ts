import type { QueryClient } from '@tanstack/react-query';

import { pioneerClient } from '@/client';
import type { ClientVoiceInputPlanResult, GatewaySettingsGetResponse } from '@/client';
import { requireVoiceInputGatewayTarget, type VoiceInputGatewayTarget } from './gateway-target';
import { voiceInputPollInterval } from './presentation';

const VOICE_INPUT_STALE_TIME_MS = 1_000;

type GatewayVoiceInputSettings = NonNullable<GatewaySettingsGetResponse['settings']['voice_input']>;
export type VoiceInputStatusReduction = Extract<
    ClientVoiceInputPlanResult,
    { operation: 'status_reduction' }
>['reduction'];

export const voiceInputQueryKeys = {
    all: ['voice-input'] as const,
    gateway: (gatewayId: string) => [...voiceInputQueryKeys.all, { gatewayId }] as const,
    settings: (target: VoiceInputGatewayTarget) =>
        [
            ...voiceInputQueryKeys.gateway(target.gatewayId),
            'settings',
            { connectionId: target.connectionId },
        ] as const,
    status: (target: VoiceInputGatewayTarget) =>
        [
            ...voiceInputQueryKeys.gateway(target.gatewayId),
            'status',
            { connectionId: target.connectionId },
        ] as const,
};

export const fetchVoiceInputSettings = async (
    target: VoiceInputGatewayTarget,
): Promise<GatewaySettingsGetResponse> => {
    requireVoiceInputGatewayTarget(target);
    const response = await pioneerClient.gatewaySettingsGet();
    requireVoiceInputGatewayTarget(target);
    return response;
};

export const reduceVoiceInputStatus = (
    current: GatewayVoiceInputSettings | null | undefined,
): VoiceInputStatusReduction => {
    const result = pioneerClient.voiceInputSettingsPlan({
        operation: 'status_reduction',
        current: current ?? { enabled: false },
    });

    if (result.operation !== 'status_reduction') {
        throw new Error('unexpected Voice Input status plan result');
    }

    return result.reduction;
};

export const voiceInputSettingsQueryOptions = (target: VoiceInputGatewayTarget) => ({
    queryKey: voiceInputQueryKeys.settings(target),
    queryFn: () => fetchVoiceInputSettings(target),
    staleTime: VOICE_INPUT_STALE_TIME_MS,
    refetchInterval: (query: { state: { data?: GatewaySettingsGetResponse } }) =>
        voiceInputPollInterval(query.state.data?.settings.voice_input, true),
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
});

export const voiceInputStatusQueryOptions = (target: VoiceInputGatewayTarget) => ({
    queryKey: voiceInputQueryKeys.status(target),
    queryFn: async () => {
        const settings = await fetchVoiceInputSettings(target);
        return reduceVoiceInputStatus(settings.settings.voice_input);
    },
    staleTime: VOICE_INPUT_STALE_TIME_MS,
});

export const clearVoiceInputQueries = (queryClient: QueryClient): Promise<void> => {
    const cancellation = queryClient.cancelQueries({ queryKey: voiceInputQueryKeys.all });
    queryClient.removeQueries({ queryKey: voiceInputQueryKeys.all });
    return cancellation;
};

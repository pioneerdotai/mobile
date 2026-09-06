import type { QueryClient } from '@tanstack/react-query';

import { pioneerClient, mobileClientBinding } from '@/client';
import type { GatewaySettingsStore } from '@/client/generated/gateway_settings_store';
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
    const scope = { kind: 'settings' } as const;
    mobileClientBinding.scope(scope);
    await pioneerClient.gatewaySettingsGet();
    requireVoiceInputGatewayTarget(target);
    await mobileClientBinding.synchronize();
    requireVoiceInputGatewayTarget(target);
    const publication = mobileClientBinding.scope(scope).getSnapshot()
        ?.payload as GatewaySettingsStore | null;
    if (!publication?.settings) {
        throw new Error('Gateway settings are no longer available');
    }
    return { settings: publication.settings };
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

/** Apply the accepted Client settings revision to the legacy voice query views. */
export const applyPublishedVoiceInputSettings = (
    queryClient: QueryClient,
    target: VoiceInputGatewayTarget,
    publication: GatewaySettingsStore,
): void => {
    try {
        requireVoiceInputGatewayTarget(target);
    } catch {
        return;
    }
    if (!publication.settings && !publication.voice_input) {
        void queryClient.cancelQueries({ queryKey: voiceInputQueryKeys.gateway(target.gatewayId) });
        queryClient.removeQueries({ queryKey: voiceInputQueryKeys.gateway(target.gatewayId) });
        return;
    }
    if (publication.settings) {
        queryClient.setQueryData(voiceInputQueryKeys.settings(target), {
            settings: publication.settings,
        });
    }
    if (publication.voice_input) {
        queryClient.setQueryData(
            voiceInputQueryKeys.status(target),
            reduceVoiceInputStatus(publication.voice_input),
        );
    }
};

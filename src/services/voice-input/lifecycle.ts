import type { QueryClient } from '@tanstack/react-query';

import type { ClientEvent } from '@/client';
import type { VoiceInputGatewayTarget } from './gateway-target';
import { requireVoiceInputGatewayTarget } from './gateway-target';
import { voiceInputQueryKeys } from './query';

export type GatewayEventIdentity = Readonly<{
    gatewayId: string | null;
    connectionId: number | null;
}>;

export const isVoiceInputStatusChangedEvent = (event: ClientEvent | null): boolean =>
    Boolean(
        event &&
        'GatewayNotification' in event &&
        event.GatewayNotification.kind === 'gateway_voice_input_status_changed',
    );

const invalidateActiveVoiceInputSnapshot = async (
    queryClient: QueryClient,
    target: VoiceInputGatewayTarget,
): Promise<void> => {
    await Promise.all([
        queryClient.invalidateQueries({
            queryKey: voiceInputQueryKeys.settings(target),
            refetchType: 'active',
        }),
        queryClient.invalidateQueries({
            queryKey: voiceInputQueryKeys.status(target),
            refetchType: 'active',
        }),
    ]);
};

export const handleVoiceInputGatewayEvent = async (
    queryClient: QueryClient,
    target: VoiceInputGatewayTarget | null,
    identity: GatewayEventIdentity,
    event: ClientEvent | null,
): Promise<boolean> => {
    if (
        !target ||
        identity.gatewayId !== target.gatewayId ||
        identity.connectionId !== target.connectionId ||
        !isVoiceInputStatusChangedEvent(event)
    ) {
        return false;
    }

    try {
        requireVoiceInputGatewayTarget(target);
        await invalidateActiveVoiceInputSnapshot(queryClient, target);
        return true;
    } catch {
        return false;
    }
};

export const refetchVoiceInputAfterResume = async (
    queryClient: QueryClient,
    target: VoiceInputGatewayTarget | null,
): Promise<boolean> => {
    if (!target) {
        return false;
    }

    try {
        requireVoiceInputGatewayTarget(target);
        await invalidateActiveVoiceInputSnapshot(queryClient, target);
        return true;
    } catch {
        return false;
    }
};

import { useGatewayStore } from '@/stores/gateway';
import { useWorkspaceStore } from '@/stores/workspace';

export type VoiceInputGatewayTarget = Readonly<{
    gatewayId: string;
    connectionId: number;
    workspaceId: string | null;
}>;

export class VoiceInputGatewayInactiveError extends Error {
    readonly code = 'voice_input_gateway_inactive';

    constructor(readonly gatewayId: string) {
        super(`Voice Input Gateway is no longer active: ${gatewayId}`);
        this.name = 'VoiceInputGatewayInactiveError';
    }
}

export const activeVoiceInputGatewayTarget = (): VoiceInputGatewayTarget | null => {
    const gateway = useGatewayStore.getState();
    const gatewayId = gateway.registry.active_gateway_id;

    if (
        !gatewayId ||
        gateway.connectionState !== 'Connected' ||
        gateway.connectionId === null ||
        gateway.connectionGatewayId !== gatewayId
    ) {
        return null;
    }

    return {
        gatewayId,
        connectionId: gateway.connectionId,
        workspaceId: useWorkspaceStore.getState().activeWorkspaceId,
    };
};

export const isVoiceInputGatewayTargetActive = (target: VoiceInputGatewayTarget): boolean => {
    const active = activeVoiceInputGatewayTarget();

    return active?.gatewayId === target.gatewayId && active.connectionId === target.connectionId;
};

export const requireVoiceInputGatewayTarget = (target: VoiceInputGatewayTarget): void => {
    if (!isVoiceInputGatewayTargetActive(target)) {
        throw new VoiceInputGatewayInactiveError(target.gatewayId);
    }
};

import { useEffect, useMemo } from 'react';

import { useGatewayStore } from '@/stores/gateway';
import { useWorkspaceStore } from '@/stores/workspace';
import type { VoiceInputGatewayTarget } from './gateway-target';
import { mobileClientBinding } from '@/client';

export type VoiceInputDataSourceState =
    | Readonly<{
          kind: 'offline';
          gatewayId: string | null;
          readOnly: true;
          target: null;
      }>
    | Readonly<{
          kind: 'online';
          gatewayId: string;
          readOnly: false;
          target: VoiceInputGatewayTarget;
      }>;

export const voiceInputDataSourceState = (
    gatewayId: string | null,
    connectionId: number | null,
    connected: boolean,
    workspaceId: string | null,
): VoiceInputDataSourceState => {
    if (!gatewayId || !connected || connectionId === null) {
        return {
            kind: 'offline',
            gatewayId,
            readOnly: true,
            target: null,
        };
    }

    return {
        kind: 'online',
        gatewayId,
        readOnly: false,
        target: { gatewayId, connectionId, workspaceId },
    };
};

export const useVoiceInputDataSourceState = (): VoiceInputDataSourceState => {
    const gatewayId = useGatewayStore((state) => state.registry.active_gateway_id ?? null);
    const connectionId = useGatewayStore((state) => state.connectionId);
    const connected = useGatewayStore(
        (state) =>
            state.connectionState === 'Connected' &&
            state.connectionGatewayId === (state.registry.active_gateway_id ?? null),
    );
    const workspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

    return useMemo(
        () => voiceInputDataSourceState(gatewayId, connectionId, connected, workspaceId),
        [connected, connectionId, gatewayId, workspaceId],
    );
};

export const useVoiceInputGatewayLifecycle = (): void => {
    useEffect(() => {
        const store = mobileClientBinding.scope({ kind: 'settings' });
        return store.subscribe(() => {});
    }, []);
};

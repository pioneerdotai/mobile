import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

import { useGatewayStore } from '@/stores/gateway';
import { useWorkspaceStore } from '@/stores/workspace';
import type { VoiceInputGatewayTarget } from './gateway-target';
import { refetchVoiceInputAfterResume } from './lifecycle';
import { mobileClientBinding } from '@/client';
import type { GatewaySettingsStore } from '@/client/generated/gateway_settings_store';
import { clearVoiceInputQueries, applyPublishedVoiceInputSettings } from './query';

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

export const useVoiceInputGatewayQueryLifecycle = (): void => {
    const queryClient = useQueryClient();
    const state = useVoiceInputDataSourceState();
    const identity =
        state.kind === 'online' ? `${state.gatewayId}:${state.target.connectionId}` : null;
    const previousIdentityRef = useRef<string | null | undefined>(undefined);
    const previousAppStateRef = useRef(AppState.currentState);

    useLayoutEffect(() => {
        if (previousIdentityRef.current === identity) {
            return;
        }

        previousIdentityRef.current = identity;
        void clearVoiceInputQueries(queryClient);
    }, [identity, queryClient]);

    useEffect(() => {
        const binding = mobileClientBinding.scope({ kind: 'settings' });
        const apply = () => {
            const publication = binding.getSnapshot()?.payload as GatewaySettingsStore | undefined;
            if (publication && state.target) {
                applyPublishedVoiceInputSettings(queryClient, state.target, publication);
            }
        };
        const unregister = binding.subscribe(apply);
        apply();
        return unregister;
    }, [queryClient, state.target]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState) => {
            const resumed = nextState === 'active' && previousAppStateRef.current !== 'active';
            previousAppStateRef.current = nextState;

            if (resumed) {
                void refetchVoiceInputAfterResume(queryClient, state.target);
            }
        });

        return () => subscription.remove();
    }, [queryClient, state.target]);
};

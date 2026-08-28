import { create } from 'zustand';

import type {
    ClientEvent,
    GatewayConnectionState,
    GatewayRegistry,
    RemoteGatewayValidation,
    SessionTerminalReason,
} from '@/client';
import { defaultGatewayRegistry } from '@/services/gateway/registry';
import type { GatewayOperationErrorCode } from '@/services/gateway/registry';
import type {
    MobileSessionLifecyclePhase,
    MobileSessionProjection,
} from '@/services/gateway/session-coordinator';

type GatewayStoreState = {
    registry: GatewayRegistry;
    bootstrapped: boolean;
    busy: boolean;
    error: GatewayOperationErrorCode | null;
    gatewayTransportSecurity: RemoteGatewayValidation['transport_security'] | null;
    registryReconfigurationEndpointIds: readonly string[] | null;
    connectionId: number | null;
    connectionGatewayId: string | null;
    connectionState: GatewayConnectionState;
    lastEvent: ClientEvent | null;
    lastEventSerial: number;
    lastEventGatewayId: string | null;
    lastEventConnectionId: number | null;
    sessionError: string | null;
    sessionRevision: number;
    sessionLifecyclePhase: MobileSessionLifecyclePhase;
    sessionPrincipalId: string | null;
    sessionDeviceId: string | null;
    sessionId: string | null;
    sessionAccessExpiresAtUnix: number | null;
    sessionTerminalReason: SessionTerminalReason | null;
    sessionConnectionGeneration: number | null;
    showGatewaySwitcher: boolean;
    setRegistry: (registry: GatewayRegistry) => void;
    setBootstrapped: (bootstrapped: boolean) => void;
    setBusy: (busy: boolean) => void;
    setError: (error: GatewayOperationErrorCode | null) => void;
    setGatewayTransportSecurity: (
        security: RemoteGatewayValidation['transport_security'] | null,
    ) => void;
    setRegistryReconfigurationEndpointIds: (endpointIds: readonly string[] | null) => void;
    setConnectionId: (connectionId: number | null) => void;
    setConnectionGatewayId: (gatewayId: string | null) => void;
    setConnectionState: (connectionState: GatewayConnectionState) => void;
    setLastEvent: (
        event: ClientEvent | null,
        gatewayId?: string | null,
        connectionId?: number | null,
    ) => void;
    setSessionError: (error: string | null) => void;
    bumpSessionRevision: () => void;
    setSessionProjection: (projection: MobileSessionProjection) => void;
    clearError: () => void;
    setGatewaySwitcherOpen: (open: boolean) => void;
};

export const useGatewayStore = create<GatewayStoreState>((set) => ({
    registry: defaultGatewayRegistry(),
    bootstrapped: false,
    busy: false,
    error: null,
    gatewayTransportSecurity: null,
    registryReconfigurationEndpointIds: null,
    connectionId: null,
    connectionGatewayId: null,
    connectionState: 'Idle',
    lastEvent: null,
    lastEventSerial: 0,
    lastEventGatewayId: null,
    lastEventConnectionId: null,
    sessionError: null,
    sessionRevision: 0,
    sessionLifecyclePhase: 'needs_authentication',
    sessionPrincipalId: null,
    sessionDeviceId: null,
    sessionId: null,
    sessionAccessExpiresAtUnix: null,
    sessionTerminalReason: null,
    sessionConnectionGeneration: null,
    showGatewaySwitcher: false,

    setRegistry: (registry) => {
        set({ registry });
    },

    setBootstrapped: (bootstrapped) => {
        set({ bootstrapped });
    },

    setBusy: (busy) => {
        set({ busy });
    },

    setError: (error) => {
        set({ error });
    },

    setGatewayTransportSecurity: (gatewayTransportSecurity) => {
        set({ gatewayTransportSecurity });
    },

    setRegistryReconfigurationEndpointIds: (registryReconfigurationEndpointIds) => {
        set({ registryReconfigurationEndpointIds });
    },

    setConnectionId: (connectionId) => {
        set({ connectionId });
    },

    setConnectionGatewayId: (connectionGatewayId) => {
        set({ connectionGatewayId });
    },

    setConnectionState: (connectionState) => {
        set({ connectionState });
    },

    setLastEvent: (event, lastEventGatewayId = null, lastEventConnectionId = null) => {
        set((state) => ({
            lastEvent: event,
            lastEventGatewayId,
            lastEventConnectionId,
            lastEventSerial: state.lastEventSerial + 1,
        }));
    },

    setSessionError: (error) => {
        set({ sessionError: error });
    },

    bumpSessionRevision: () => {
        set((state) => ({ sessionRevision: state.sessionRevision + 1 }));
    },

    setSessionProjection: (projection) => {
        set({
            sessionLifecyclePhase: projection.phase,
            sessionPrincipalId: projection.principalId,
            sessionDeviceId: projection.deviceId,
            sessionId: projection.sessionId,
            sessionAccessExpiresAtUnix: projection.accessExpiresAtUnix,
            sessionTerminalReason: projection.terminalReason,
            sessionConnectionGeneration: projection.connectionGeneration,
        });
    },

    clearError: () => {
        set({ error: null });
    },

    setGatewaySwitcherOpen: (open) => {
        set({ showGatewaySwitcher: open });
    },
}));

import { create } from 'zustand';

import type {
    ClientEvent,
    GatewayConnectionState,
    GatewayRegistry,
    SessionTerminalReason,
} from '@/client';
import type { GatewayDestinationsPublication } from '@/client/generated/gateway_destinations_publication';
import type { GatewayOperationErrorCode } from '@/services/gateway/registry';
import type {
    MobileSessionLifecyclePhase,
    MobileSessionProjection,
} from '@/services/gateway/session-coordinator';

type GatewayStoreState = {
    registry: GatewayRegistry;
    applyOnboardingProjection: (value: GatewayDestinationsPublication) => void;
    bootstrapped: boolean;
    busy: boolean;
    error: GatewayOperationErrorCode | null;
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
    setConnectionId: (connectionId: number | null) => void;
    setConnectionGatewayId: (gatewayId: string | null) => void;
    setConnectionState: (connectionState: GatewayConnectionState) => void;
    setLastEvent: (
        event: ClientEvent | null,
        gatewayId?: string | null,
        connectionId?: number | null,
    ) => void;
    setSessionError: (error: string | null) => void;
    setSessionProjection: (projection: MobileSessionProjection) => void;
    setGatewaySwitcherOpen: (open: boolean) => void;
};

export const useGatewayStore = create<GatewayStoreState>((set) => ({
    registry: {
        version: 3,
        installation_id: null,
        active_gateway_id: null,
        local: null,
        remotes: [],
    },
    bootstrapped: false,
    busy: false,
    error: null,
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

    applyOnboardingProjection: (value) =>
        set((state) => {
            const registry: GatewayRegistry = {
                version: 3,
                installation_id: value.installation_id ?? null,
                active_gateway_id: value.selected_endpoint ?? null,
                local: value.endpoints.find((endpoint) => endpoint.kind === 'local') ?? null,
                remotes: value.endpoints.filter((endpoint) => endpoint.kind === 'remote'),
            };
            return {
                registry:
                    JSON.stringify(state.registry) === JSON.stringify(registry)
                        ? state.registry
                        : registry,
                bootstrapped: Boolean(value.installation_id),
                busy: value.loading || Boolean(value.pending_endpoint),
                error: value.error ? 'operationFailed' : null,
            };
        }),

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

    setGatewaySwitcherOpen: (open) => {
        set({ showGatewaySwitcher: open });
    },
}));

import { create } from 'zustand';

import type { ClientEvent, GatewayConnectionState, GatewayRegistry } from '@/client';
import { defaultGatewayRegistry } from '@/services/gateway/registry';
import type { GatewayOperationErrorCode } from '@/services/gateway/registry';

type GatewayStoreState = {
    registry: GatewayRegistry;
    bootstrapped: boolean;
    busy: boolean;
    error: GatewayOperationErrorCode | null;
    connectionId: number | null;
    connectionState: GatewayConnectionState;
    lastEvent: ClientEvent | null;
    lastEventSerial: number;
    sessionError: string | null;
    sessionRevision: number;
    showGatewaySwitcher: boolean;
    setRegistry: (registry: GatewayRegistry) => void;
    setBootstrapped: (bootstrapped: boolean) => void;
    setBusy: (busy: boolean) => void;
    setError: (error: GatewayOperationErrorCode | null) => void;
    setConnectionId: (connectionId: number | null) => void;
    setConnectionState: (connectionState: GatewayConnectionState) => void;
    setLastEvent: (event: ClientEvent | null) => void;
    setSessionError: (error: string | null) => void;
    bumpSessionRevision: () => void;
    clearError: () => void;
    setGatewaySwitcherOpen: (open: boolean) => void;
};

export const useGatewayStore = create<GatewayStoreState>((set) => ({
    registry: defaultGatewayRegistry(),
    bootstrapped: false,
    busy: false,
    error: null,
    connectionId: null,
    connectionState: 'Idle',
    lastEvent: null,
    lastEventSerial: 0,
    sessionError: null,
    sessionRevision: 0,
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

    setConnectionId: (connectionId) => {
        set({ connectionId });
    },

    setConnectionState: (connectionState) => {
        set({ connectionState });
    },

    setLastEvent: (event) => {
        set((state) => ({ lastEvent: event, lastEventSerial: state.lastEventSerial + 1 }));
    },

    setSessionError: (error) => {
        set({ sessionError: error });
    },

    bumpSessionRevision: () => {
        set((state) => ({ sessionRevision: state.sessionRevision + 1 }));
    },

    clearError: () => {
        set({ error: null });
    },

    setGatewaySwitcherOpen: (open) => {
        set({ showGatewaySwitcher: open });
    },
}));

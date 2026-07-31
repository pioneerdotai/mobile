import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { AppState } from 'react-native';

import type { GatewayEndpoint } from '@/client';
import type {
    MobileGatewayConnection,
    MobileSessionProjection,
} from '@/services/gateway/session-coordinator';

const mockConnectGatewayEndpoint =
    jest.fn<(endpoint: GatewayEndpoint) => Promise<MobileGatewayConnection>>();
const mockDisconnectGateway = jest.fn<(endpointId?: string) => Promise<boolean>>();
const mockSetConnectionId = jest.fn();
const mockSetConnectionGatewayId = jest.fn();
const mockSetConnectionState = jest.fn();
const mockSetLastEvent = jest.fn();
const mockSetSessionError = jest.fn();
const mockSetSessionProjection = jest.fn();
const mockTranslate = (key: string) => key;
let mockNetworkListener: ((state: { isConnected?: boolean }) => void) | null = null;

const projection: MobileSessionProjection = {
    phase: 'connected',
    deviceId: 'device-1',
    sessionId: 'session-1',
    accessExpiresAtUnix: 1_800_000_000,
    terminalReason: null,
    connectionGeneration: 1,
};

jest.setMock('expo-network', {
    addNetworkStateListener: (listener: (state: { isConnected?: boolean }) => void) => {
        mockNetworkListener = listener;
        return { remove: jest.fn() };
    },
});

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: mockTranslate }),
}));

jest.mock('@/services/gateway/session', () => ({
    connectGatewayEndpoint: mockConnectGatewayEndpoint,
    disconnectGateway: mockDisconnectGateway,
    gatewaySessionProjection: () => projection,
    gatewaySessionRefreshDelayMs: () => null,
    markMobileGatewayConnectionDisconnected: jest.fn(),
    subscribeGatewayEvents: () => jest.fn(),
    subscribeMobileSessionProjection: () => jest.fn(),
}));

jest.mock('@/services/gateway/session-coordinator', () => ({
    MobileSessionTerminalError: class MobileSessionTerminalError extends Error {},
    markMobileGatewaySessionTerminal: jest.fn(),
    terminalReasonFromMachineCode: () => null,
}));

jest.mock('@/stores/gateway', () => ({
    useGatewayStore: (selector: (state: Record<string, unknown>) => unknown) =>
        selector({
            setConnectionId: mockSetConnectionId,
            setConnectionGatewayId: mockSetConnectionGatewayId,
            setConnectionState: mockSetConnectionState,
            setLastEvent: mockSetLastEvent,
            setSessionError: mockSetSessionError,
            setSessionProjection: mockSetSessionProjection,
        }),
}));

const { useGatewaySession } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./use-gateway-session') as typeof import('./use-gateway-session');

const gateway = (overrides: Partial<GatewayEndpoint> = {}): GatewayEndpoint => ({
    id: 'remote-1',
    kind: 'remote',
    name: 'Gateway',
    address: 'ws://gateway.test',
    server_gateway_id: 'server-gateway-1',
    service_name: null,
    session_ref: 'session-ref-1',
    workspace_id: 'workspace-1',
    ...overrides,
});

const Harness = ({
    endpoint,
    sessionRevision = 0,
}: {
    endpoint: GatewayEndpoint;
    sessionRevision?: number;
}) => {
    useGatewaySession(endpoint, sessionRevision);
    return null;
};

describe('useGatewaySession', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Object.defineProperty(AppState, 'currentState', {
            configurable: true,
            value: 'active',
        });
        jest.spyOn(AppState, 'addEventListener').mockReturnValue({
            remove: jest.fn(),
        });
        mockNetworkListener = null;
        mockConnectGatewayEndpoint.mockResolvedValue({
            connection_id: 1,
            projection,
        });
        mockDisconnectGateway.mockResolvedValue(true);
    });

    it('keeps one connection when registry updates only workspace metadata', async () => {
        const initialGateway = gateway();
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(<Harness endpoint={initialGateway} />);
        });

        expect(mockConnectGatewayEndpoint).toHaveBeenCalledTimes(1);

        await act(async () => {
            tree!.update(
                <Harness
                    endpoint={gateway({
                        name: 'Renamed Gateway',
                        workspace_id: 'workspace-2',
                    })}
                />,
            );
        });

        expect(mockConnectGatewayEndpoint).toHaveBeenCalledTimes(1);
        expect(mockDisconnectGateway).not.toHaveBeenCalled();

        await act(async () => {
            mockNetworkListener?.({ isConnected: true });
        });

        expect(mockConnectGatewayEndpoint).toHaveBeenCalledTimes(1);
    });

    it('reconnects when connection-relevant Gateway data changes', async () => {
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(<Harness endpoint={gateway()} />);
        });

        await act(async () => {
            tree!.update(<Harness endpoint={gateway({ address: 'wss://gateway.test' })} />);
        });

        expect(mockDisconnectGateway).toHaveBeenCalledTimes(1);
        expect(mockConnectGatewayEndpoint).toHaveBeenCalledTimes(2);
    });
});

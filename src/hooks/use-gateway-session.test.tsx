import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
const mockOpenActiveThreadById =
    jest.fn<
        (request: { thread_id: string; expanded_keys: string[] }) => Promise<{ thread_id: string }>
    >();
const mockCacheActiveThreadSnapshot = jest.fn();
const mockResetActiveThread = jest.fn(() => {
    mockActiveThreadSnapshot = null;
});
const mockResetDefaultComposerModelSelection = jest.fn();
const mockTranslate = (key: string) => key;
let mockNetworkListener: ((state: { isConnected?: boolean }) => void) | null = null;
let mockGatewayEventListener: ((event: Record<string, unknown>) => Promise<void>) | null = null;
let mockAppStateListener: ((state: 'active' | 'background' | 'inactive') => void) | null = null;
let mockActiveThreadSnapshot: { thread_id: string } | null = null;
let mockConnectionState = 'Idle';

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
    subscribeGatewayEvents: (listener: (event: Record<string, unknown>) => Promise<void>) => {
        mockGatewayEventListener = listener;
        return jest.fn();
    },
    subscribeMobileSessionProjection: () => jest.fn(),
}));

jest.mock('@/services/gateway/session-coordinator', () => ({
    MobileSessionTerminalError: class MobileSessionTerminalError extends Error {},
    markMobileGatewaySessionTerminal: jest.fn(),
    terminalReasonFromMachineCode: () => null,
}));

jest.mock('@/services/administration/events', () => ({
    applyMobileAdministrationEvent: jest.fn(),
    isAdministrationEvent: () => false,
}));

jest.mock('@/services/administration/query', () => ({
    clearAdministrationQueries: jest.fn(),
    invalidateAdministrationTargets: jest.fn(),
}));

jest.mock('@/services/gateway/access-change', () => ({
    accessChangedWorkspaceId: () => null,
    applyMobileAccessChangedEvent: jest.fn(),
    beginMobileAuthorizationEpoch: jest.fn(),
    failClosedMobileAccessChange: jest.fn(),
}));

jest.mock('@/services/threads/active', () => ({
    openActiveThreadById: mockOpenActiveThreadById,
}));

jest.mock('@/services/query/client', () => ({
    pioneerQueryClient: {},
}));

jest.mock('@/services/threads/timeline-query', () => ({
    cacheActiveThreadSnapshot: mockCacheActiveThreadSnapshot,
    timelineQueryKeys: { all: ['timeline'] },
}));

jest.mock('@/stores/active-thread', () => ({
    useActiveThreadStore: {
        getState: () => ({
            activeComposerThreadId: mockActiveThreadSnapshot?.thread_id ?? null,
            expandedKeys: [],
            reset: mockResetActiveThread,
            resetDefaultComposerModelSelection: mockResetDefaultComposerModelSelection,
        }),
    },
}));

jest.mock('@/stores/gateway', () => {
    const useGatewayStore = (selector: (state: Record<string, unknown>) => unknown) =>
        selector({
            setConnectionId: mockSetConnectionId,
            setConnectionGatewayId: mockSetConnectionGatewayId,
            setConnectionState: mockSetConnectionState,
            setLastEvent: mockSetLastEvent,
            setSessionError: mockSetSessionError,
            setSessionProjection: mockSetSessionProjection,
        });
    useGatewayStore.getState = () => ({ connectionState: mockConnectionState });
    return { useGatewayStore };
});

const { useGatewaySession } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./use-gateway-session') as typeof import('./use-gateway-session');

const gateway = (overrides: Partial<GatewayEndpoint> = {}): GatewayEndpoint => ({
    id: 'remote-1',
    kind: 'remote',
    name: 'Gateway',
    gateway_base_url: 'http://gateway.test/',
    server_gateway_id: 'server-gateway-1',
    service_name: null,
    session_ref: 'session-ref-1',
    workspace_id: 'workspace-1',
    ...overrides,
});

const GatewaySessionHarness = ({
    endpoint,
    sessionRevision = 0,
}: {
    endpoint: GatewayEndpoint;
    sessionRevision?: number;
}) => {
    useGatewaySession(endpoint, sessionRevision);
    return null;
};

let queryClient: QueryClient;

const Harness = (props: React.ComponentProps<typeof GatewaySessionHarness>) => (
    <QueryClientProvider client={queryClient}>
        <GatewaySessionHarness {...props} />
    </QueryClientProvider>
);

describe('useGatewaySession', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        Object.defineProperty(AppState, 'currentState', {
            configurable: true,
            value: 'active',
        });
        jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
            mockAppStateListener = listener;
            return { remove: jest.fn() };
        });
        mockNetworkListener = null;
        mockGatewayEventListener = null;
        mockAppStateListener = null;
        mockActiveThreadSnapshot = null;
        mockConnectionState = 'Idle';
        mockSetConnectionState.mockImplementation((state) => {
            mockConnectionState = String(state);
        });
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
            tree!.update(
                <Harness endpoint={gateway({ gateway_base_url: 'https://gateway.test/' })} />,
            );
        });

        expect(mockDisconnectGateway).toHaveBeenCalledTimes(1);
        expect(mockConnectGatewayEndpoint).toHaveBeenCalledTimes(2);
    });

    it('rotates access and restores the active thread without publishing Connecting', async () => {
        mockOpenActiveThreadById.mockResolvedValue({ thread_id: 'thread-1' });
        mockConnectGatewayEndpoint
            .mockResolvedValueOnce({ connection_id: 1, projection })
            .mockResolvedValueOnce({ connection_id: 2, projection });

        await act(async () => {
            renderer.create(<Harness endpoint={gateway()} />);
        });
        mockActiveThreadSnapshot = { thread_id: 'thread-1' };

        mockSetConnectionState.mockClear();
        await act(async () => {
            await mockGatewayEventListener?.({
                GatewayNotification: {
                    kind: 'auth_access_expiring',
                    params: { session_id: 'session-1', access_expires_at_unix: 1_800_000_000 },
                },
            });
        });

        expect(mockConnectGatewayEndpoint).toHaveBeenCalledTimes(2);
        expect(mockOpenActiveThreadById).toHaveBeenCalledWith({
            thread_id: 'thread-1',
            expanded_keys: [],
        });
        expect(mockCacheActiveThreadSnapshot).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ thread_id: 'thread-1' }),
        );
        expect(mockSetConnectionId).not.toHaveBeenCalledWith(2);
        expect(mockSetConnectionState).not.toHaveBeenCalledWith('Connecting');
        expect(mockSetConnectionState).toHaveBeenLastCalledWith('Connected');
    });

    it('does not reconnect or clear visible state for a short inactive interruption', async () => {
        await act(async () => {
            renderer.create(<Harness endpoint={gateway()} />);
        });

        mockSetConnectionId.mockClear();
        mockSetConnectionGatewayId.mockClear();
        mockSetConnectionState.mockClear();

        await act(async () => {
            mockAppStateListener?.('inactive');
            mockAppStateListener?.('active');
            await Promise.resolve();
        });

        expect(mockDisconnectGateway).not.toHaveBeenCalled();
        expect(mockConnectGatewayEndpoint).toHaveBeenCalledTimes(1);
        expect(mockSetConnectionId).not.toHaveBeenCalled();
        expect(mockSetConnectionGatewayId).not.toHaveBeenCalled();
        expect(mockSetConnectionState).not.toHaveBeenCalled();
    });

    it('restores a backgrounded transport without clearing or republishing the screen', async () => {
        mockOpenActiveThreadById.mockResolvedValue({ thread_id: 'thread-1' });
        mockConnectGatewayEndpoint
            .mockResolvedValueOnce({ connection_id: 1, projection })
            .mockResolvedValueOnce({ connection_id: 2, projection });

        await act(async () => {
            renderer.create(<Harness endpoint={gateway()} />);
        });
        mockActiveThreadSnapshot = { thread_id: 'thread-1' };

        mockSetConnectionId.mockClear();
        mockSetConnectionGatewayId.mockClear();
        mockSetConnectionState.mockClear();

        await act(async () => {
            mockAppStateListener?.('background');
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(mockDisconnectGateway).toHaveBeenCalledWith('remote-1');
        expect(mockSetConnectionId).not.toHaveBeenCalled();
        expect(mockSetConnectionGatewayId).not.toHaveBeenCalled();
        expect(mockSetConnectionState).not.toHaveBeenCalledWith('Idle');

        await act(async () => {
            mockAppStateListener?.('active');
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(mockConnectGatewayEndpoint).toHaveBeenCalledTimes(2);
        expect(mockOpenActiveThreadById).toHaveBeenCalledWith({
            thread_id: 'thread-1',
            expanded_keys: [],
        });
        expect(mockCacheActiveThreadSnapshot).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ thread_id: 'thread-1' }),
        );
        expect(mockSetConnectionId).not.toHaveBeenCalled();
        expect(mockSetConnectionGatewayId).not.toHaveBeenCalled();
        expect(mockSetConnectionState).not.toHaveBeenCalledWith('Connecting');
        expect(mockSetConnectionState).toHaveBeenLastCalledWith('Connected');
    });

    it('keeps protected state visible while reconnecting after a transient transport loss', async () => {
        mockConnectGatewayEndpoint
            .mockResolvedValueOnce({ connection_id: 1, projection })
            .mockResolvedValueOnce({ connection_id: 2, projection });

        await act(async () => {
            renderer.create(<Harness endpoint={gateway()} />);
        });

        mockSetConnectionId.mockClear();
        mockSetConnectionState.mockClear();

        await act(async () => {
            await mockGatewayEventListener?.({
                GatewayConnectionChanged: {
                    connection_id: 1,
                    connection_state: 'Disconnected',
                    gateway_error: null,
                },
            });
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(mockConnectGatewayEndpoint).toHaveBeenCalledTimes(2);
        expect(mockSetConnectionId).not.toHaveBeenCalledWith(null);
        expect(mockSetConnectionState).not.toHaveBeenCalledWith('Disconnected');
        expect(mockSetConnectionState).toHaveBeenLastCalledWith('Connected');
    });

    it('retries a transient cold-start session failure without user interaction', async () => {
        jest.useFakeTimers();
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<></>);
        });
        try {
            mockConnectGatewayEndpoint
                .mockRejectedValueOnce(new Error('Gateway temporarily unavailable'))
                .mockResolvedValueOnce({ connection_id: 2, projection });

            await act(async () => {
                tree.update(<Harness endpoint={gateway()} />);
                await Promise.resolve();
            });

            expect(mockConnectGatewayEndpoint).toHaveBeenCalledTimes(1);

            await act(async () => {
                jest.advanceTimersByTime(500);
                await Promise.resolve();
                await Promise.resolve();
            });

            expect(mockConnectGatewayEndpoint).toHaveBeenCalledTimes(2);
            expect(mockSetConnectionState).toHaveBeenLastCalledWith('Connected');
        } finally {
            await act(async () => {
                tree.unmount();
            });
            jest.useRealTimers();
        }
    });
});

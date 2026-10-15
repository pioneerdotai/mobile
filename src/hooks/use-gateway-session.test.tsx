import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { useGatewaySession } from './use-gateway-session';
import type { GatewayEndpoint } from '@/client';

const mockDispatch = jest.fn();
const mockAppRemove = jest.fn();
const mockNetworkRemove = jest.fn();
const mockDiagnosticRemove = jest.fn();
let mockAppListener: (state: string) => void;
let mockNetworkListener: (state: { isConnected: boolean }) => void;
let mockClosed = false;
jest.mock('react-native', () => {
    const native = Object.create(jest.requireActual<object>('react-native'));
    Object.defineProperty(native, 'AppState', {
        value: {
            currentState: 'active',
            addEventListener: (_: string, callback: typeof mockAppListener) => {
                mockAppListener = callback;
                return { remove: mockAppRemove };
            },
        },
    });
    return native;
});
jest.mock('expo-network', () => ({
    addNetworkStateListener: (callback: typeof mockNetworkListener) => {
        mockNetworkListener = callback;
        return { remove: mockNetworkRemove };
    },
}));
jest.mock('@/client', () => ({
    mobileClientBinding: {
        dispatch: (...args: unknown[]) => mockDispatch(...args),
        isClosed: () => mockClosed,
    },
}));
jest.mock('@/services/gateway/session-coordinator', () => ({
    subscribeMobileSessionDiagnostics: () => mockDiagnosticRemove,
}));
jest.mock('@/services/telemetry/mobile-startup', () => ({ mobileStartup: {} }));
const endpoint = {
    id: 'gateway',
    kind: 'remote',
    name: 'Gateway',
    gateway_base_url: 'https://gateway.test/',
} as GatewayEndpoint;
const Harness = ({ gateway = endpoint }: { gateway?: GatewayEndpoint }) => {
    useGatewaySession(gateway, 0);
    return null;
};
const demands = () =>
    mockDispatch.mock.calls.map(
        (call) =>
            (
                call[0] as {
                    intent: {
                        demand: {
                            endpoint_id: string | null;
                            visibility: string;
                            network_available: boolean;
                            generation: number;
                        };
                    };
                }
            ).intent.demand,
    );
describe('native session demand adapter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockClosed = false;
    });
    it('forwards foreground, network, inactive and background observations in generation order', async () => {
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<Harness />);
        });
        act(() => {
            mockNetworkListener({ isConnected: false });
            mockAppListener('inactive');
            mockAppListener('background');
            mockAppListener('active');
        });
        expect(demands().map((value) => [value.visibility, value.network_available])).toEqual([
            ['foreground', true],
            ['foreground', false],
            ['inactive', false],
            ['background', false],
            ['foreground', false],
        ]);
        await act(async () => tree.unmount());
        expect(demands().at(-1)?.endpoint_id).toBeNull();
        expect(
            demands().every((value, i, all) => i === 0 || value.generation > all[i - 1].generation),
        ).toBe(true);
        expect(mockAppRemove).toHaveBeenCalledTimes(1);
        expect(mockNetworkRemove).toHaveBeenCalledTimes(1);
        expect(mockDiagnosticRemove).toHaveBeenCalledTimes(1);
        const count = demands().length;
        act(() => {
            mockNetworkListener({ isConnected: true });
            mockAppListener('active');
        });
        expect(demands()).toHaveLength(count);
    });
    it('replaces the exact endpoint lease and ignores native callbacks after process close', async () => {
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<Harness />);
        });
        await act(async () => tree.update(<Harness gateway={{ ...endpoint, id: 'other' }} />));
        expect(demands().map((value) => value.endpoint_id)).toEqual(['gateway', null, 'other']);
        mockClosed = true;
        act(() => mockAppListener('background'));
        await act(async () => tree.unmount());
        expect(demands()).toHaveLength(3);
    });
    it('does not issue new session policy when only presentation metadata changes', async () => {
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<Harness />);
        });
        await act(async () => tree.update(<Harness gateway={{ ...endpoint, name: 'Renamed' }} />));
        expect(demands()).toHaveLength(1);
        await act(async () => tree.unmount());
    });
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { GatewayEndpoint, GatewaySessionConnectionResult } from '@/client';
import type { ClientScope } from '@/client/generated/client_scope';
import { pioneerClient, mobileClientBinding, PioneerClientNativeError } from '@/client';
import {
    ensureMobileGatewaySession,
    refreshMobileGatewaySessionAfterUnauthorized,
    mobileSessionProjection,
    subscribeMobileSessionProjection,
    suspendMobileGatewaySession,
    clearMobileGatewaySessionRuntime,
    markMobileGatewaySessionTerminal,
    resetMobileSessionCoordinatorForTests,
    MobileSessionTerminalError,
    MobileSessionSuspendedError,
    subscribeMobileSessionDiagnostics,
} from './session-coordinator';

let mockSessionPayload: Record<string, unknown> | null = null;
let mockIdentityPayload: Record<string, unknown> | null = null;
const mockListeners = new Set<() => void>();

jest.mock('@/client', () => ({
    PioneerClientNativeError: class extends Error {
        readonly code: string;
        constructor(message: string, code: string) {
            super(message);
            this.code = code;
        }
    },
    pioneerClient: { gatewaySessionEnsure: jest.fn(), gatewaySessionControl: jest.fn() },
    mobileClientBinding: {
        scope: (scope: ClientScope) => ({
            getSnapshot: () => ({
                payload: scope.kind === 'session' ? mockSessionPayload : mockIdentityPayload,
            }),
            subscribe: (listener: () => void) => {
                mockListeners.add(listener);
                return () => mockListeners.delete(listener);
            },
        }),
        synchronize: jest.fn(async () => {
            for (const listener of [...mockListeners]) {
                listener();
            }
        }),
    },
}));
jest.mock('./registry', () => ({ loadGatewayRegistry: () => ({ installation_id: 'synthetic' }) }));

const endpoint: GatewayEndpoint = {
    id: 'synthetic',
    name: 'Synthetic',
    gateway_base_url: 'https://gateway.invalid',
    kind: 'remote',
    session_ref: 'synthetic',
    service_name: null,
    server_gateway_id: 'G00000000000000000001',
};
const timings = {
    connect_timeout_ms: 1000,
    ping_interval_ms: 1000,
    pong_timeout_ms: 1000,
    reconnect_initial_ms: 100,
    reconnect_max_ms: 1000,
    reconnect_jitter_percent: 0,
};
const result: GatewaySessionConnectionResult = {
    connection_id: 17,
    connection_generation: 4,
    access_expires_at_unix: 2000,
    metadata: {
        gateway_id: 'G00000000000000000001',
        device_id: 'D00000000000000000001',
        session_id: 'S00000000000000000001',
        refresh_generation: 1,
        refresh_expires_at_unix: 4000,
    },
};

const publishConnected = () => {
    mockSessionPayload = {
        sessions: {
            synthetic: {
                kind: 'active',
                data: {
                    metadata: result.metadata,
                    connection_generation: 4,
                    access_expires_at_unix: 2000,
                },
            },
        },
        connections: { synthetic: { epoch: 1, connected: result, failure: null } },
        access_expiries: { synthetic: 2000 },
    };
    mockIdentityPayload = {
        current_auth: {
            principal: { id: 'P00000000000000000001' },
            session: { id: result.metadata.session_id },
        },
    };
};

beforeEach(() => {
    jest.clearAllMocks();
    mockSessionPayload = null;
    mockIdentityPayload = null;
    mockListeners.clear();
    resetMobileSessionCoordinatorForTests();
    jest.mocked(pioneerClient.gatewaySessionEnsure)
        .mockReset()
        .mockImplementation(async () => {
            publishConnected();
            return result;
        });
    jest.mocked(pioneerClient.gatewaySessionControl).mockReset().mockResolvedValue(true);
});

describe('Mobile session native runtime adapter', () => {
    it('retains native stage durations across delayed publication and duplicate delivery', async () => {
        const listener = jest.fn();
        const unsubscribe = subscribeMobileSessionDiagnostics('synthetic', listener);
        mockSessionPayload = {
            startup: {
                session_diagnostics: {
                    refresh_request: {
                        endpoint_id: 'synthetic',
                        started_at_unix_ms: 123456,
                        duration_ms: 47,
                        state: 'succeeded',
                    },
                },
            },
        };
        await mobileClientBinding.synchronize();
        await mobileClientBinding.synchronize();
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith({
            stage: 'authorization.refresh.request',
            outcome: 'succeeded',
            timing: { started_at_unix_ms: 123456, duration_ms: 47 },
        });
        unsubscribe();
        expect(mockListeners.size).toBe(0);
    });

    it('dispatches a credential-free request and reads identity/session after ordered synchronization', async () => {
        const connected = await ensureMobileGatewaySession(endpoint, timings);
        expect(pioneerClient.gatewaySessionEnsure).toHaveBeenCalledWith({
            endpoint,
            timings,
            installation_id: 'synthetic',
            rejected_connection_id: undefined,
        });
        expect(mobileClientBinding.synchronize).toHaveBeenCalledTimes(1);
        expect(connected).toEqual({
            connection_id: 17,
            projection: {
                phase: 'connected',
                principalId: 'P00000000000000000001',
                deviceId: result.metadata.device_id,
                sessionId: result.metadata.session_id,
                accessExpiresAtUnix: 2000,
                terminalReason: null,
                connectionGeneration: 17,
            },
        });
    });

    it('leaves request coalescing to the process-local Core', async () => {
        await Promise.all([
            ensureMobileGatewaySession(endpoint, timings),
            ensureMobileGatewaySession(endpoint, timings),
        ]);
        expect(pioneerClient.gatewaySessionEnsure).toHaveBeenCalledTimes(2);
    });

    it('passes the rejected native connection identity without a JS disconnect/rotation sequence', async () => {
        await refreshMobileGatewaySessionAfterUnauthorized(endpoint, timings, 9);
        expect(pioneerClient.gatewaySessionEnsure).toHaveBeenCalledWith({
            endpoint,
            timings,
            installation_id: 'synthetic',
            rejected_connection_id: 9,
        });
        expect(pioneerClient.gatewaySessionControl).not.toHaveBeenCalled();
    });

    it('rejects a native result superseded before its publications were applied', async () => {
        jest.mocked(pioneerClient.gatewaySessionEnsure).mockResolvedValue(result);
        await expect(ensureMobileGatewaySession(endpoint, timings)).rejects.toBeInstanceOf(
            MobileSessionSuspendedError,
        );
    });

    it('uses the Core terminal projection for the existing shell error type', async () => {
        jest.mocked(pioneerClient.gatewaySessionEnsure).mockImplementation(async () => {
            mockSessionPayload = {
                sessions: {
                    synthetic: {
                        kind: 'terminal',
                        data: { metadata: result.metadata, reason: 'session_revoked' },
                    },
                },
                connections: {},
            };
            throw new PioneerClientNativeError('stopped', 'session_revoked');
        });
        await expect(ensureMobileGatewaySession(endpoint, timings)).rejects.toBeInstanceOf(
            MobileSessionTerminalError,
        );
        expect(mobileSessionProjection(endpoint.id).phase).toBe('revoked');
    });

    it('preserves the expired presentation for invalid refresh credentials', () => {
        mockSessionPayload = {
            sessions: {
                synthetic: { kind: 'terminal', data: { reason: 'refresh_credential_invalid' } },
            },
            connections: {},
        };
        expect(mobileSessionProjection(endpoint.id).phase).toBe('expired');
    });

    it('owns only scoped registration tokens and suppresses duplicate immutable projections', async () => {
        const seen: string[] = [];
        const unsubscribe = subscribeMobileSessionProjection(endpoint.id, (projection) =>
            seen.push(projection.phase),
        );
        publishConnected();
        await mobileClientBinding.synchronize();
        await mobileClientBinding.synchronize();
        expect(seen).toEqual(['needs_authentication', 'connected']);
        unsubscribe();
        expect(mockListeners.size).toBe(0);
    });

    it('delegates suspend, clear, and stop to typed Core controls', async () => {
        await suspendMobileGatewaySession(endpoint.id);
        await clearMobileGatewaySessionRuntime(endpoint.id);
        await markMobileGatewaySessionTerminal(endpoint.id, 'session_revoked');
        expect(
            jest.mocked(pioneerClient.gatewaySessionControl).mock.calls.map(([request]) => request),
        ).toEqual([
            { kind: 'suspend', endpoint_id: endpoint.id },
            { kind: 'clear', endpoint_id: endpoint.id },
            { kind: 'stop', endpoint_id: endpoint.id, reason: 'session_revoked' },
        ]);
    });
});

/* eslint-disable import/first */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('nanoid', () => ({ nanoid: jest.fn(() => '00000000000000000000') }));

jest.mock('@/client', () => {
    class MockPioneerClientNativeError extends Error {
        readonly code?: string | null;

        constructor(message: string, code?: string | null) {
            super(message);
            this.code = code;
        }
    }

    return {
        PioneerClientNativeError: MockPioneerClientNativeError,
        pioneerClient: {
            gatewayAuthRefresh: jest.fn(),
            gatewayAuthSessionCleanup: jest.fn(),
            gatewaySessionReplaceAccess: jest.fn(),
            gatewayAuthMe: jest.fn(),
            gatewayDisconnect: jest.fn(),
            gatewaySessionLifecycleReduce: jest.fn(),
        },
    };
});

jest.mock('./session-storage', () => {
    class MockMobileGatewaySessionStorageError extends Error {
        readonly code: string;

        constructor(code: string) {
            super(code);
            this.code = code;
        }
    }

    return {
        MOBILE_GATEWAY_SESSION_SCHEMA_VERSION: 2,
        MobileGatewaySessionStorageError: MockMobileGatewaySessionStorageError,
        readMobileGatewaySession: jest.fn(),
        writeMobileGatewaySession: jest.fn(),
    };
});

jest.mock('./registry', () => ({
    loadGatewayRegistry: jest.fn(() => ({
        installation_id: 'installation-mobile-1',
    })),
}));

import { PioneerClientNativeError, pioneerClient } from '@/client';
import type {
    AuthRefreshGrant,
    ClientGatewaySessionLifecycleRequest,
    ClientGatewaySessionLifecycleResult,
    GatewayEndpoint,
} from '@/client';
import {
    ensureMobileGatewaySession,
    markMobileGatewayConnectionDisconnected,
    markMobileGatewaySessionTerminal,
    mobileSessionProjection,
    resetMobileSessionCoordinatorForTests,
    suspendMobileGatewaySession,
} from './session-coordinator';
import type { MobileGatewaySessionEnvelope } from './session-storage';
import {
    MobileGatewaySessionStorageError,
    readMobileGatewaySession,
    writeMobileGatewaySession,
} from './session-storage';

const mockGatewayAuthRefresh = jest.mocked(pioneerClient.gatewayAuthRefresh);
const mockGatewayAuthSessionCleanup = jest.mocked(pioneerClient.gatewayAuthSessionCleanup);
const mockGatewaySessionReplaceAccess = jest.mocked(pioneerClient.gatewaySessionReplaceAccess);
const mockGatewayAuthMe = jest.mocked(pioneerClient.gatewayAuthMe);
const mockGatewayDisconnect = jest.mocked(pioneerClient.gatewayDisconnect);
const mockGatewaySessionLifecycleReduce = jest.mocked(pioneerClient.gatewaySessionLifecycleReduce);
const mockReadMobileGatewaySession = jest.mocked(readMobileGatewaySession);
const mockWriteMobileGatewaySession = jest.mocked(writeMobileGatewaySession);

const endpoint: GatewayEndpoint = {
    id: 'remote-1',
    name: 'Remote',
    address: 'wss://gateway.example/ws',
    kind: 'remote',
    session_ref: 'mobile-session-1',
    server_gateway_id: 'G00000000000000000001',
    service_name: null,
    workspace_id: null,
};

const timings = {
    connect_timeout_ms: 5_000,
    ping_interval_ms: 10_000,
    pong_timeout_ms: 30_000,
    reconnect_initial_ms: 500,
    reconnect_max_ms: 10_000,
    reconnect_jitter_percent: 20,
};

const accessToken = 'test_access_header.test_access_payload.test_access_signature';
const refreshToken = (generation: number) =>
    `prf2_${generation.toString().padStart(20, '0')}${'0'.repeat(144)}`;

const envelope = (generation: number): MobileGatewaySessionEnvelope => ({
    schema_version: 2,
    gateway_id: 'G00000000000000000001',
    principal_id: 'P00000000000000000001',
    device_id: 'D00000000000000000001',
    session_id: 'S00000000000000000001',
    token_family_id: 'F00000000000000000001',
    installation_id: 'installation-mobile-1',
    refresh_generation: generation,
    refresh_expires_at_unix: 1_900_000_000,
    refresh_token: refreshToken(generation),
});

const refreshGrant = (generation: number, accessExpiry: number): AuthRefreshGrant => ({
    gateway: { id: 'G00000000000000000001' },
    principal: {
        id: 'P00000000000000000001',
        kind: 'superuser',
        display_name: 'Superuser',
        nickname: 'superuser',
    },
    access_token: accessToken,
    access_expires_at_unix: accessExpiry,
    refresh_token: refreshToken(generation),
    refresh_expires_at_unix: 1_900_000_000,
    refresh_generation: generation,
    auth_protocol_version: 3,
    credential_storage_order: 'persist_refresh_before_activating_access',
    device: {
        id: 'D00000000000000000001',
        installation_id: 'installation-mobile-1',
        display_name: 'Phone',
        client_kind: 'mobile',
        status: 'active',
    },
    session: {
        id: 'S00000000000000000001',
        device_id: 'D00000000000000000001',
        token_family_id: 'F00000000000000000001',
        status: 'active',
        refresh_generation: generation,
        refresh_expires_at_unix: 1_900_000_000,
    },
});

const authMe = {
    gateway: { id: 'G00000000000000000001' },
    principal: {
        id: 'P00000000000000000001',
        kind: 'superuser' as const,
        display_name: 'Superuser',
        nickname: 'superuser',
    },
    device: {
        id: 'D00000000000000000001',
        installation_id: 'installation-mobile-1',
        display_name: 'Phone',
        client_kind: 'mobile' as const,
        status: 'active' as const,
    },
    session: {
        id: 'S00000000000000000001',
        device_id: 'D00000000000000000001',
        token_family_id: 'F00000000000000000001',
        status: 'active' as const,
        refresh_generation: 1,
        refresh_expires_at_unix: 1_900_000_000,
    },
};

const currentAuthMe = (generation: number) => ({
    ...authMe,
    session: {
        ...authMe.session,
        refresh_generation: generation,
    },
});

const installLifecycleDouble = () => {
    let intent = 0;
    let connectionGeneration = 0;
    mockGatewaySessionLifecycleReduce.mockImplementation(
        async (
            request: ClientGatewaySessionLifecycleRequest,
        ): Promise<ClientGatewaySessionLifecycleResult> => {
            const event = request.event;
            let effect: ClientGatewaySessionLifecycleResult['effect'];
            if (event.kind === 'stored_session_loaded' || event.kind === 'clock_advanced') {
                intent += 1;
                effect = {
                    kind: 'begin_refresh',
                    data: { session_id: envelope(0).session_id, intent_id: intent },
                };
            } else if (event.kind === 'refresh_grant_received') {
                connectionGeneration += 1;
                effect = {
                    kind: 'persist_refresh_before_access',
                    data: {
                        intent_id: event.data.intent_id,
                        candidate_connection_generation: connectionGeneration,
                    },
                };
            } else if (event.kind === 'secure_storage_committed') {
                effect = {
                    kind: 'connect_with_ephemeral_access',
                    data: { connection_generation: connectionGeneration },
                };
            } else if (event.kind === 'connection_established') {
                effect = {
                    kind: 'switch_connection',
                    data: {
                        active_connection_generation: event.data.generation,
                        close_connection_generation: null,
                    },
                };
            } else if (event.kind === 'connection_transport_failed') {
                effect = {
                    kind: 'retry_connection',
                    data: { connection_generation: event.data.generation },
                };
            } else if (event.kind === 'refresh_transport_lost') {
                effect = { kind: 'stop', data: { reason: 'refresh_outcome_unknown' } };
            } else if (event.kind === 'secure_storage_failed') {
                effect = { kind: 'stop', data: { reason: 'secure_storage_failed' } };
            } else if (event.kind === 'auth_failed') {
                effect = { kind: 'stop', data: { reason: event.data.reason } };
            } else {
                effect = { kind: 'none' };
            }
            return { state: { kind: 'no_session' }, effect };
        },
    );
};

describe('mobile Gateway session coordinator', () => {
    let durableEnvelope: MobileGatewaySessionEnvelope;
    let nowSeconds: number;

    beforeEach(() => {
        jest.clearAllMocks();
        resetMobileSessionCoordinatorForTests();
        nowSeconds = 1_800_000_000;
        jest.spyOn(Date, 'now').mockImplementation(() => nowSeconds * 1_000);
        durableEnvelope = envelope(0);
        installLifecycleDouble();
        mockReadMobileGatewaySession.mockImplementation(async () =>
            structuredClone(durableEnvelope),
        );
        mockWriteMobileGatewaySession.mockImplementation(
            async (_sessionRef: string, next: MobileGatewaySessionEnvelope) => {
                durableEnvelope = structuredClone(next);
            },
        );
        mockGatewayAuthRefresh.mockImplementation(async () =>
            refreshGrant(durableEnvelope.refresh_generation + 1, nowSeconds + 900),
        );
        mockGatewayAuthSessionCleanup.mockResolvedValue({
            session_id: durableEnvelope.session_id,
            revoked: true,
        });
        mockGatewaySessionReplaceAccess.mockResolvedValue({ connection_id: 41 });
        mockGatewayAuthMe.mockImplementation(async () =>
            currentAuthMe(durableEnvelope.refresh_generation),
        );
        mockGatewayDisconnect.mockResolvedValue(true);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('coalesces duplicate connect triggers into one refresh', async () => {
        let releaseRefresh: ((grant: AuthRefreshGrant) => void) | undefined;
        mockGatewayAuthRefresh.mockImplementationOnce(
            () =>
                new Promise<AuthRefreshGrant>((resolve) => {
                    releaseRefresh = resolve;
                }),
        );

        const first = ensureMobileGatewaySession(endpoint, timings);
        const second = ensureMobileGatewaySession(endpoint, timings);
        expect(first).toBe(second);
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(mockReadMobileGatewaySession).toHaveBeenCalledTimes(1);
        expect(releaseRefresh).toBeDefined();

        releaseRefresh!(refreshGrant(1, nowSeconds + 900));
        await expect(Promise.all([first, second])).resolves.toHaveLength(2);
        expect(mockGatewayAuthRefresh).toHaveBeenCalledTimes(1);
        expect(mockGatewaySessionReplaceAccess).toHaveBeenCalledTimes(1);
    });

    it('persists rotation before activating access', async () => {
        const order: string[] = [];
        mockWriteMobileGatewaySession.mockImplementation(
            async (_sessionRef: string, next: MobileGatewaySessionEnvelope) => {
                order.push('persist');
                durableEnvelope = structuredClone(next);
            },
        );
        mockGatewaySessionReplaceAccess.mockImplementation(async () => {
            order.push('connect');
            return { connection_id: 42 };
        });

        await ensureMobileGatewaySession(endpoint, timings);

        expect(order).toEqual(['persist', 'connect']);
        expect(durableEnvelope.refresh_generation).toBe(1);
    });

    it('rotates again when access expires while the connection is being established', async () => {
        const lifecycle = mockGatewaySessionLifecycleReduce.getMockImplementation();
        expect(lifecycle).toBeDefined();
        mockGatewaySessionLifecycleReduce.mockImplementation(async (request) => {
            if (request.event.kind === 'connection_transport_failed') {
                return {
                    state: {
                        kind: 'refreshing',
                        data: {
                            metadata: {
                                gateway_id: durableEnvelope.gateway_id,
                                device_id: durableEnvelope.device_id,
                                session_id: durableEnvelope.session_id,
                                refresh_generation: durableEnvelope.refresh_generation,
                                refresh_expires_at_unix: durableEnvelope.refresh_expires_at_unix,
                            },
                            intent_id: 2,
                            previous_connection_generation: null,
                        },
                    },
                    effect: {
                        kind: 'begin_refresh',
                        data: {
                            session_id: durableEnvelope.session_id,
                            intent_id: 2,
                        },
                    },
                };
            }
            return lifecycle!(request);
        });
        mockGatewaySessionReplaceAccess
            .mockImplementationOnce(async () => {
                nowSeconds += 1_000;
                throw new Error('connection completed after access expiry');
            })
            .mockResolvedValueOnce({ connection_id: 42 });

        const connected = await ensureMobileGatewaySession(endpoint, timings);

        expect(connected.connection_id).toBe(42);
        expect(mockGatewayAuthRefresh).toHaveBeenCalledTimes(2);
        expect(mockGatewaySessionReplaceAccess).toHaveBeenCalledTimes(2);
        expect(durableEnvelope.refresh_generation).toBe(2);
        expect(mobileSessionProjection(endpoint.id).phase).toBe('connected');
    });

    it('refreshes after background access expiry and reconnects once', async () => {
        mockGatewayAuthRefresh.mockResolvedValueOnce(refreshGrant(1, nowSeconds + 61));
        await ensureMobileGatewaySession(endpoint, timings);
        await suspendMobileGatewaySession(endpoint.id);
        nowSeconds += 2;

        await ensureMobileGatewaySession(endpoint, timings);

        expect(mockGatewayAuthRefresh).toHaveBeenCalledTimes(2);
        expect(mockGatewaySessionReplaceAccess).toHaveBeenCalledTimes(2);
        expect(mobileSessionProjection(endpoint.id).phase).toBe('connected');
    });

    it('drops unexpired access on background and obtains new access on foreground', async () => {
        await ensureMobileGatewaySession(endpoint, timings);
        await suspendMobileGatewaySession(endpoint.id);

        await ensureMobileGatewaySession(endpoint, timings);

        expect(mockGatewayAuthRefresh).toHaveBeenCalledTimes(2);
        expect(mockGatewaySessionReplaceAccess).toHaveBeenCalledTimes(2);
        expect(durableEnvelope.refresh_generation).toBe(2);
    });

    it('does not publish connected when the app suspends during identity verification', async () => {
        let releaseMe: ((value: typeof authMe) => void) | undefined;
        mockGatewayAuthMe.mockImplementationOnce(
            () =>
                new Promise<typeof authMe>((resolve) => {
                    releaseMe = resolve;
                }),
        );
        const connecting = ensureMobileGatewaySession(endpoint, timings);
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(releaseMe).toBeDefined();

        const suspended = suspendMobileGatewaySession(endpoint.id);
        releaseMe!(authMe);

        await suspended;
        await expect(connecting).rejects.toMatchObject({
            name: 'MobileSessionSuspendedError',
        });
        expect(mobileSessionProjection(endpoint.id).phase).toBe('transiently_disconnected');
    });

    it('does not let an in-flight connection overwrite a terminal revoke', async () => {
        let releaseMe: ((value: typeof authMe) => void) | undefined;
        mockGatewayAuthMe.mockImplementationOnce(
            () =>
                new Promise<typeof authMe>((resolve) => {
                    releaseMe = resolve;
                }),
        );
        const connecting = ensureMobileGatewaySession(endpoint, timings);
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(releaseMe).toBeDefined();

        const terminal = markMobileGatewaySessionTerminal(endpoint.id, 'session_revoked');
        await new Promise<void>((resolve) => setImmediate(resolve));
        releaseMe!(authMe);

        await terminal;
        await expect(connecting).rejects.toMatchObject({
            name: 'MobileSessionSuspendedError',
        });
        expect(mobileSessionProjection(endpoint.id)).toMatchObject({
            phase: 'revoked',
            terminalReason: 'session_revoked',
            deviceId: 'D00000000000000000001',
            sessionId: 'S00000000000000000001',
        });
        await suspendMobileGatewaySession(endpoint.id);
        expect(mobileSessionProjection(endpoint.id)).toMatchObject({
            phase: 'revoked',
            terminalReason: 'session_revoked',
            deviceId: 'D00000000000000000001',
            sessionId: 'S00000000000000000001',
        });
    });

    it('keeps a known revoke terminal when the lifecycle bridge itself fails', async () => {
        mockGatewaySessionLifecycleReduce.mockRejectedValueOnce(
            new Error('injected lifecycle bridge failure'),
        );

        await expect(
            markMobileGatewaySessionTerminal(endpoint.id, 'session_revoked'),
        ).resolves.toBeUndefined();
        expect(mobileSessionProjection(endpoint.id)).toMatchObject({
            phase: 'revoked',
            terminalReason: 'session_revoked',
        });
    });

    it('requires explicit authentication for an unbound endpoint', async () => {
        const unbound = {
            ...endpoint,
            session_ref: null,
            server_gateway_id: null,
        };

        await expect(ensureMobileGatewaySession(unbound, timings)).rejects.toMatchObject({
            reason: 'authentication_required',
        });
        expect(mockReadMobileGatewaySession).not.toHaveBeenCalled();
        expect(mobileSessionProjection(unbound.id)).toMatchObject({
            phase: 'needs_authentication',
            terminalReason: 'authentication_required',
        });
    });

    it('distinguishes a missing session from an unreadable secure store', async () => {
        mockReadMobileGatewaySession.mockResolvedValueOnce(null);
        await expect(ensureMobileGatewaySession(endpoint, timings)).rejects.toMatchObject({
            reason: 'authentication_required',
        });
        expect(mobileSessionProjection(endpoint.id)).toMatchObject({
            phase: 'needs_authentication',
            terminalReason: 'authentication_required',
        });

        resetMobileSessionCoordinatorForTests();
        installLifecycleDouble();
        mockReadMobileGatewaySession.mockRejectedValueOnce(
            new MobileGatewaySessionStorageError('read_failed'),
        );
        await expect(ensureMobileGatewaySession(endpoint, timings)).rejects.toMatchObject({
            reason: 'secure_storage_failed',
        });
        expect(mobileSessionProjection(endpoint.id)).toMatchObject({
            phase: 'storage_failed',
            terminalReason: 'secure_storage_failed',
        });
    });

    it('fails closed when the durable session does not match the Gateway pin', async () => {
        mockReadMobileGatewaySession.mockResolvedValueOnce({
            ...envelope(0),
            gateway_id: 'G00000000000000000002',
        });

        await expect(ensureMobileGatewaySession(endpoint, timings)).rejects.toMatchObject({
            reason: 'gateway_identity_mismatch',
        });
        expect(mobileSessionProjection(endpoint.id)).toMatchObject({
            phase: 'gateway_mismatch',
            terminalReason: 'gateway_identity_mismatch',
        });
    });

    it('reconnects a dropped socket with unexpired ephemeral access without rotating again', async () => {
        await ensureMobileGatewaySession(endpoint, timings);
        markMobileGatewayConnectionDisconnected(endpoint.id);

        const reconnected = await ensureMobileGatewaySession(endpoint, timings);

        expect(reconnected.connection_id).toBe(41);
        expect(mockGatewayAuthRefresh).toHaveBeenCalledTimes(1);
        expect(mockGatewaySessionReplaceAccess).toHaveBeenCalledTimes(2);
        expect(mobileSessionProjection(endpoint.id).phase).toBe('connected');
    });

    it('reloads the refresh credential from SecureStore for an in-foreground rotation', async () => {
        mockGatewayAuthRefresh.mockResolvedValueOnce(refreshGrant(1, nowSeconds + 61));
        await ensureMobileGatewaySession(endpoint, timings);
        const durableOnlyRefresh = `prf2_${'2'.repeat(164)}`;
        durableEnvelope = {
            ...durableEnvelope,
            refresh_token: durableOnlyRefresh,
        };
        nowSeconds += 2;

        await ensureMobileGatewaySession(endpoint, timings);

        expect(mockReadMobileGatewaySession).toHaveBeenCalledTimes(2);
        expect(mockGatewayAuthRefresh.mock.calls[1]?.[0].credential).toBe(durableOnlyRefresh);
    });

    it('fails closed when auth/me reports a different mobile installation', async () => {
        mockGatewayAuthMe.mockResolvedValueOnce({
            ...currentAuthMe(1),
            device: {
                ...authMe.device,
                installation_id: 'different-installation',
            },
        });

        await expect(ensureMobileGatewaySession(endpoint, timings)).rejects.toMatchObject({
            reason: 'session_compromised',
        });
        expect(mockGatewayDisconnect).toHaveBeenCalled();
        expect(mobileSessionProjection(endpoint.id)).toMatchObject({
            phase: 'compromised',
            terminalReason: 'session_compromised',
        });
    });

    it('rejects a refresh grant for a different mobile installation before persistence', async () => {
        mockGatewayAuthRefresh.mockResolvedValueOnce({
            ...refreshGrant(1, nowSeconds + 900),
            device: {
                ...refreshGrant(1, nowSeconds + 900).device,
                installation_id: 'different-installation',
            },
        });

        await expect(ensureMobileGatewaySession(endpoint, timings)).rejects.toMatchObject({
            reason: 'session_compromised',
        });
        expect(mockGatewayAuthSessionCleanup).toHaveBeenCalledTimes(1);
        expect(mockWriteMobileGatewaySession).not.toHaveBeenCalled();
        expect(mockGatewaySessionReplaceAccess).not.toHaveBeenCalled();
    });

    it('rejects a malformed token family before persisting a rotated refresh credential', async () => {
        mockGatewayAuthRefresh.mockResolvedValueOnce({
            ...refreshGrant(1, nowSeconds + 900),
            session: {
                ...refreshGrant(1, nowSeconds + 900).session,
                token_family_id: 'invalid-family',
            },
        });

        await expect(ensureMobileGatewaySession(endpoint, timings)).rejects.toMatchObject({
            reason: 'session_compromised',
        });
        expect(mockGatewayAuthSessionCleanup).toHaveBeenCalledTimes(1);
        expect(mockWriteMobileGatewaySession).not.toHaveBeenCalled();
    });

    it('rejects a well-formed replacement token family before persistence', async () => {
        mockGatewayAuthRefresh.mockResolvedValueOnce({
            ...refreshGrant(1, nowSeconds + 900),
            session: {
                ...refreshGrant(1, nowSeconds + 900).session,
                token_family_id: 'F00000000000000000002',
            },
        });

        await expect(ensureMobileGatewaySession(endpoint, timings)).rejects.toMatchObject({
            reason: 'session_compromised',
        });
        expect(mockGatewayAuthSessionCleanup).toHaveBeenCalledTimes(1);
        expect(mockWriteMobileGatewaySession).not.toHaveBeenCalled();
    });

    it('serializes old-endpoint cleanup before connecting a replacement endpoint', async () => {
        await ensureMobileGatewaySession(endpoint, timings);
        const replacement = {
            ...endpoint,
            id: 'remote-2',
            session_ref: 'mobile-session-2',
        };
        const order: string[] = [];
        mockGatewayDisconnect.mockImplementationOnce(async () => {
            order.push('disconnect-old');
            return true;
        });
        mockGatewaySessionReplaceAccess.mockImplementationOnce(async (request) => {
            order.push(`connect-${request.endpoint.id}`);
            return { connection_id: 42 };
        });

        const oldCleanup = suspendMobileGatewaySession(endpoint.id);
        const newConnection = ensureMobileGatewaySession(replacement, timings);
        await oldCleanup;
        await newConnection;

        expect(order).toEqual(['disconnect-old', 'connect-remote-2']);
    });

    it('retains ownership of the active endpoint when another replacement handshake fails', async () => {
        await ensureMobileGatewaySession(endpoint, timings);
        const replacement = {
            ...endpoint,
            id: 'remote-2',
            session_ref: 'mobile-session-2',
        };
        mockGatewayDisconnect.mockClear();
        mockGatewaySessionReplaceAccess.mockRejectedValueOnce(new Error('replacement failed'));

        await expect(ensureMobileGatewaySession(replacement, timings)).rejects.toThrow(
            'replacement failed',
        );
        expect(mockGatewayDisconnect).not.toHaveBeenCalled();

        await suspendMobileGatewaySession(endpoint.id);
        expect(mockGatewayDisconnect).toHaveBeenCalledTimes(1);
    });

    it('invalidates the previous runtime when another endpoint successfully owns the transport', async () => {
        await ensureMobileGatewaySession(endpoint, timings);
        const replacement = {
            ...endpoint,
            id: 'remote-2',
            session_ref: 'mobile-session-2',
        };

        await ensureMobileGatewaySession(replacement, timings);

        expect(mobileSessionProjection(endpoint.id).phase).toBe('transiently_disconnected');
        await ensureMobileGatewaySession(endpoint, timings);
        expect(mockGatewaySessionReplaceAccess).toHaveBeenCalledTimes(3);
        expect(mobileSessionProjection(endpoint.id).phase).toBe('connected');
        expect(mobileSessionProjection(replacement.id).phase).toBe('transiently_disconnected');
    });

    it('reloads the durable rotated envelope after a process restart', async () => {
        await ensureMobileGatewaySession(endpoint, timings);
        expect(durableEnvelope.refresh_generation).toBe(1);
        resetMobileSessionCoordinatorForTests();
        installLifecycleDouble();

        await ensureMobileGatewaySession(endpoint, timings);

        expect(mockGatewayAuthRefresh.mock.calls[1]?.[0].credential).toBe(refreshToken(1));
        expect(durableEnvelope.refresh_generation).toBe(2);
    });

    it('makes an ambiguous refresh outcome terminal without retrying', async () => {
        mockGatewayAuthRefresh.mockRejectedValueOnce(new Error('response lost'));

        await expect(ensureMobileGatewaySession(endpoint, timings)).rejects.toMatchObject({
            reason: 'refresh_outcome_unknown',
        });
        await expect(ensureMobileGatewaySession(endpoint, timings)).rejects.toMatchObject({
            reason: 'refresh_outcome_unknown',
        });

        expect(mockGatewayAuthRefresh).toHaveBeenCalledTimes(1);
        expect(mobileSessionProjection(endpoint.id)).toMatchObject({
            phase: 'compromised',
            terminalReason: 'refresh_outcome_unknown',
        });
    });

    it('retries the durable credential when the refresh request was not dispatched', async () => {
        mockGatewayAuthRefresh.mockRejectedValueOnce(
            new PioneerClientNativeError(
                'Gateway connection failed',
                'auth_exchange_transport_before_request',
            ),
        );

        await expect(ensureMobileGatewaySession(endpoint, timings)).rejects.toMatchObject({
            code: 'auth_exchange_transport_before_request',
        });
        expect(mobileSessionProjection(endpoint.id)).toMatchObject({
            phase: 'transiently_disconnected',
            terminalReason: null,
        });
        expect(durableEnvelope.refresh_generation).toBe(0);

        await expect(ensureMobileGatewaySession(endpoint, timings)).resolves.toMatchObject({
            connection_id: 41,
        });

        expect(mockGatewayAuthRefresh).toHaveBeenCalledTimes(2);
        expect(mockGatewayAuthRefresh.mock.calls[0]?.[0].credential).toBe(refreshToken(0));
        expect(mockGatewayAuthRefresh.mock.calls[1]?.[0].credential).toBe(refreshToken(0));
        expect(mobileSessionProjection(endpoint.id)).toMatchObject({
            phase: 'connected',
            terminalReason: null,
        });
    });

    it('keeps an existing connection visible while retrying a refresh not dispatched', async () => {
        await ensureMobileGatewaySession(endpoint, timings);
        nowSeconds += 850;
        mockGatewayDisconnect.mockClear();
        mockGatewayAuthRefresh.mockRejectedValueOnce(
            new PioneerClientNativeError(
                'Gateway connection failed',
                'auth_exchange_transport_before_request',
            ),
        );

        await expect(ensureMobileGatewaySession(endpoint, timings)).rejects.toMatchObject({
            code: 'auth_exchange_transport_before_request',
        });
        expect(mockGatewayDisconnect).not.toHaveBeenCalled();
        expect(mobileSessionProjection(endpoint.id)).toMatchObject({
            phase: 'connected',
            terminalReason: null,
            accessExpiresAtUnix: 1_800_000_900,
        });

        await expect(ensureMobileGatewaySession(endpoint, timings)).resolves.toMatchObject({
            connection_id: 41,
        });
        expect(mockGatewayAuthRefresh.mock.calls[1]?.[0].credential).toBe(refreshToken(1));
        expect(mockGatewayAuthRefresh.mock.calls[2]?.[0].credential).toBe(refreshToken(1));
    });

    it('persists a rotated successor when the lifecycle bridge fails after refresh', async () => {
        mockGatewaySessionLifecycleReduce
            .mockImplementationOnce(async () => ({
                state: { kind: 'no_session' },
                effect: {
                    kind: 'begin_refresh',
                    data: { session_id: envelope(0).session_id, intent_id: 1 },
                },
            }))
            .mockRejectedValueOnce(new Error('injected lifecycle bridge failure'));

        await expect(ensureMobileGatewaySession(endpoint, timings)).rejects.toThrow(
            'injected lifecycle bridge failure',
        );
        expect(durableEnvelope.refresh_generation).toBe(1);

        await ensureMobileGatewaySession(endpoint, timings);

        expect(mockGatewayAuthRefresh.mock.calls[1]?.[0].credential).toBe(refreshToken(1));
        expect(durableEnvelope.refresh_generation).toBe(2);
    });
});

/* eslint-disable import/first */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('nanoid', () => ({ nanoid: jest.fn() }));

jest.mock('@/client', () => ({
    pioneerClient: {
        gatewayLoadRegistryV3: jest.fn(),
        gatewayDeviceActivationParse: jest.fn(),
        gatewayAuthDeviceActivate: jest.fn(),
        gatewayAuthDeviceCreate: jest.fn(),
        gatewayDeviceActivationPresentation: jest.fn(),
        gatewayAuthSessionCleanup: jest.fn(),
        gatewayAuthSessionList: jest.fn(),
        gatewayAuthSessionRevoke: jest.fn(),
        gatewayAuthLogout: jest.fn(),
    },
}));

jest.mock('./registry', () => ({
    loadGatewayRegistry: jest.fn(),
    saveGatewayRegistry: jest.fn(),
    findGatewayEndpoint: jest.fn(),
    replaceGatewayEndpoint: jest.fn(),
}));

jest.mock('./session-storage', () => ({
    MOBILE_GATEWAY_SESSION_SCHEMA_VERSION: 2,
    readMobileGatewaySession: jest.fn(),
    writeMobileGatewaySession: jest.fn(),
    deleteMobileGatewaySession: jest.fn(),
}));

jest.mock('./session-coordinator', () => ({
    clearMobileGatewaySessionRuntime: jest.fn(),
    markMobileGatewaySessionTerminal: jest.fn(),
}));

jest.mock('@/storage', () => ({
    storage: {
        getAllKeys: jest.fn(),
        getString: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
    },
}));

import { pioneerClient } from '@/client';
import type { AuthSessionGrant, GatewayRegistry } from '@/client';
import { storage } from '@/storage';
import { nanoid } from 'nanoid';
import {
    findGatewayEndpoint,
    loadGatewayRegistry,
    replaceGatewayEndpoint,
    saveGatewayRegistry,
} from './registry';
import {
    clearMobileGatewaySessionRuntime,
    markMobileGatewaySessionTerminal,
} from './session-coordinator';
import {
    deleteMobileGatewaySession,
    readMobileGatewaySession,
    writeMobileGatewaySession,
} from './session-storage';
import {
    acceptMobileDeviceActivation,
    cancelMobileDeviceActivation,
    createMobileDeviceActivationPresentation,
    logoutMobileGatewaySession,
    listMobileGatewaySessions,
    parseMobileDeviceActivationUri,
    recoverPendingMobileDeviceActivationCommits,
    revokeMobileGatewaySession,
} from './device-activation';

const mockGatewayDeviceActivationParse = jest.mocked(pioneerClient.gatewayDeviceActivationParse);
const mockGatewayLoadRegistryV3 = jest.mocked(pioneerClient.gatewayLoadRegistryV3);
const mockGatewayAuthDeviceActivate = jest.mocked(pioneerClient.gatewayAuthDeviceActivate);
const mockGatewayAuthDeviceCreate = jest.mocked(pioneerClient.gatewayAuthDeviceCreate);
const mockGatewayAuthSessionCleanup = jest.mocked(pioneerClient.gatewayAuthSessionCleanup);
const mockGatewayAuthSessionList = jest.mocked(pioneerClient.gatewayAuthSessionList);
const mockGatewayAuthSessionRevoke = jest.mocked(pioneerClient.gatewayAuthSessionRevoke);
const mockGatewayAuthLogout = jest.mocked(pioneerClient.gatewayAuthLogout);
const mockGatewayDeviceActivationPresentation = jest.mocked(
    pioneerClient.gatewayDeviceActivationPresentation,
);
const mockLoadGatewayRegistry = jest.mocked(loadGatewayRegistry);
const mockSaveGatewayRegistry = jest.mocked(saveGatewayRegistry);
const mockFindGatewayEndpoint = jest.mocked(findGatewayEndpoint);
const mockReplaceGatewayEndpoint = jest.mocked(replaceGatewayEndpoint);
const mockWriteMobileGatewaySession = jest.mocked(writeMobileGatewaySession);
const mockReadMobileGatewaySession = jest.mocked(readMobileGatewaySession);
const mockDeleteMobileGatewaySession = jest.mocked(deleteMobileGatewaySession);
const mockClearMobileGatewaySessionRuntime = jest.mocked(clearMobileGatewaySessionRuntime);
const mockMarkMobileGatewaySessionTerminal = jest.mocked(markMobileGatewaySessionTerminal);
const mockStorageGetString = jest.mocked(storage.getString);
const mockStorageGetAllKeys = jest.mocked(storage.getAllKeys);
const mockStorageSet = jest.mocked(storage.set);
const mockStorageRemove = jest.mocked(storage.remove);
const mockNanoid = jest.mocked(nanoid);

const gatewayId = 'G00000000000000000001';
const activationCode = 'K7M4-P9Q2';
const canonicalActivationCode = 'K7M4P9Q2';
const activation = {
    gateway_base_url: 'https://gateway.example/',
    activation_code: activationCode,
    gateway_id: gatewayId,
};

const registry = (): GatewayRegistry => ({
    version: 3,
    installation_id: 'installation-mobile-1',
    active_gateway_id: null,
    local: null,
    remotes: [],
});

const grant = (): AuthSessionGrant => ({
    access_token: 'access_direct_only',
    access_expires_at_unix: 1_800_000_000,
    refresh_token: `prf2_${'r'.repeat(164)}`,
    refresh_expires_at_unix: 1_900_000_000,
    refresh_generation: 0,
    auth_protocol_version: 3,
    credential_storage_order: 'persist_refresh_before_activating_access',
    gateway: { id: gatewayId },
    principal: {
        id: 'P00000000000000000001',
        kind: 'superuser',
        display_name: 'Superuser',
        nickname: 'superuser',
    },
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
        refresh_generation: 0,
        refresh_expires_at_unix: 1_900_000_000,
    },
});

describe('mobile device activation service', () => {
    let activationMetadata: Map<string, string>;
    let activationMetadataWrites: string[];

    beforeEach(() => {
        jest.resetAllMocks();
        mockGatewayLoadRegistryV3.mockImplementation(({ document }) => {
            const candidate = JSON.parse(document) as GatewayRegistry;
            const gatewayBaseUrl = candidate.remotes?.[0]?.gateway_base_url ?? '';
            const parsed = new URL(gatewayBaseUrl);
            if (
                !['http:', 'https:'].includes(parsed.protocol) ||
                parsed.username ||
                parsed.password ||
                parsed.search ||
                parsed.hash ||
                !gatewayBaseUrl.endsWith('/')
            ) {
                throw new Error('invalid gateway_base_url');
            }
            return { state: 'current', registry: candidate };
        });
        mockNanoid.mockReturnValue('00000000000000000000');
        activationMetadata = new Map();
        activationMetadataWrites = [];
        mockStorageGetString.mockImplementation((key) => activationMetadata.get(key));
        mockStorageGetAllKeys.mockImplementation(() => [...activationMetadata.keys()]);
        mockStorageSet.mockImplementation((key, value) => {
            const serialized = String(value);
            activationMetadataWrites.push(serialized);
            activationMetadata.set(key, serialized);
        });
        mockStorageRemove.mockImplementation((key) => activationMetadata.delete(key));
        mockLoadGatewayRegistry.mockReturnValue(registry());
        mockFindGatewayEndpoint.mockReturnValue(null);
        mockReplaceGatewayEndpoint.mockImplementation((value, endpoint) => ({
            ...value,
            local: value.local?.id === endpoint.id ? endpoint : value.local,
            remotes: (value.remotes ?? []).map((candidate) =>
                candidate.id === endpoint.id ? endpoint : candidate,
            ),
        }));
        mockReadMobileGatewaySession.mockResolvedValue(null);
        mockWriteMobileGatewaySession.mockResolvedValue(undefined);
        mockDeleteMobileGatewaySession.mockResolvedValue(undefined);
        mockClearMobileGatewaySessionRuntime.mockResolvedValue(undefined);
        mockGatewayAuthSessionCleanup.mockResolvedValue({
            session_id: 'S00000000000000000001',
            revoked: true,
        });
        mockGatewayAuthSessionRevoke.mockResolvedValue({
            session_id: 'S00000000000000000001',
            revoked: true,
        });
        mockGatewayAuthLogout.mockResolvedValue({
            session_id: 'S00000000000000000001',
            revoked: true,
        });
        mockMarkMobileGatewaySessionTerminal.mockResolvedValue(undefined);
    });

    it('cancels only while the created session is still pending', async () => {
        await cancelMobileDeviceActivation('S00000000000000000001');

        expect(mockGatewayAuthSessionRevoke).toHaveBeenCalledWith({
            session_id: 'S00000000000000000001',
            expected_status: 'pending',
        });
    });

    it('parses a fragment-bearing deep link only through the shared parser', async () => {
        mockGatewayDeviceActivationParse.mockResolvedValue({
            ...activation,
        });
        const uri = `pioneer://activate?gateway_base_url=https%3A%2F%2Fgateway.example%2F#code=${activationCode}`;

        await expect(parseMobileDeviceActivationUri(uri)).resolves.toEqual(activation);
        expect(mockGatewayDeviceActivationParse).toHaveBeenCalledWith({ uri });
    });

    it('shows only active device sessions in the mobile devices list', async () => {
        const active = {
            current: true,
            last_seen_at_unix: 1_800_000_000,
            device: grant().device,
            session: grant().session,
        };
        mockGatewayAuthSessionList.mockResolvedValue({
            sessions: [
                active,
                {
                    ...active,
                    current: false,
                    device: {
                        ...active.device,
                        id: 'D00000000000000000002',
                        status: 'revoked',
                    },
                    session: {
                        ...active.session,
                        id: 'S00000000000000000002',
                        device_id: 'D00000000000000000002',
                        status: 'revoked',
                    },
                },
            ],
        });

        await expect(listMobileGatewaySessions()).resolves.toEqual({ sessions: [active] });
    });

    it('rejects a six-digit manual code before any exchange', async () => {
        await expect(
            acceptMobileDeviceActivation({ ...activation, activation_code: '123456' }),
        ).rejects.toMatchObject({ code: 'invalid_presentation' });
        expect(mockGatewayAuthDeviceActivate).not.toHaveBeenCalled();
    });

    it('rejects credentials embedded in a manual activation endpoint', async () => {
        await expect(
            acceptMobileDeviceActivation({
                ...activation,
                gateway_base_url: 'wss://user:password@gateway.example/ws',
            }),
        ).rejects.toMatchObject({ code: 'invalid_presentation' });
        expect(mockGatewayAuthDeviceActivate).not.toHaveBeenCalled();
    });

    it('rejects a non-canonical whitespace-padded activation endpoint', async () => {
        await expect(
            acceptMobileDeviceActivation({
                ...activation,
                gateway_base_url: ` ${activation.gateway_base_url}`,
            }),
        ).rejects.toMatchObject({ code: 'invalid_presentation' });
        expect(mockGatewayAuthDeviceActivate).not.toHaveBeenCalled();
    });

    it('allows plaintext activation for remote endpoints', async () => {
        mockGatewayAuthDeviceActivate.mockResolvedValue(grant());

        await acceptMobileDeviceActivation({
            ...activation,
            gateway_base_url: 'http://192.0.2.10:17878/',
        });

        expect(mockGatewayAuthDeviceActivate).toHaveBeenCalledWith(
            expect.objectContaining({
                gateway_base_url: 'http://192.0.2.10:17878/',
                credential: canonicalActivationCode,
            }),
        );
    });

    it('allows host-and-port activation addresses accepted by Gateway setup', async () => {
        const plannedEndpoint = {
            id: 'remote-planned',
            name: 'Local',
            gateway_base_url: 'http://192.0.2.10:17878/',
            kind: 'remote' as const,
            session_ref: null,
            server_gateway_id: null,
            service_name: null,
            workspace_id: null,
        };
        mockLoadGatewayRegistry.mockReturnValue({
            ...registry(),
            active_gateway_id: plannedEndpoint.id,
            remotes: [plannedEndpoint],
        });
        mockFindGatewayEndpoint.mockReturnValue(plannedEndpoint);
        mockGatewayAuthDeviceActivate.mockResolvedValue(grant());

        const result = await acceptMobileDeviceActivation(
            {
                ...activation,
                gateway_base_url: plannedEndpoint.gateway_base_url,
            },
            {
                candidateRegistry: {
                    ...registry(),
                    active_gateway_id: plannedEndpoint.id,
                    remotes: [plannedEndpoint],
                },
            },
        );

        expect(mockGatewayAuthDeviceActivate).toHaveBeenCalledWith(
            expect.objectContaining({
                gateway_base_url: plannedEndpoint.gateway_base_url,
                credential: canonicalActivationCode,
            }),
        );
        expect(result.endpoint).toMatchObject({
            id: plannedEndpoint.id,
            name: plannedEndpoint.name,
            gateway_base_url: plannedEndpoint.gateway_base_url,
            server_gateway_id: gatewayId,
        });
        expect(result.registry.remotes).toHaveLength(1);
    });

    it('does not commit a candidate Gateway when activation fails', async () => {
        const plannedEndpoint = {
            id: 'remote-planned',
            name: 'Local',
            gateway_base_url: 'http://192.0.2.10:17878/',
            kind: 'remote' as const,
            session_ref: null,
            server_gateway_id: null,
            service_name: null,
            workspace_id: null,
        };
        mockGatewayAuthDeviceActivate.mockRejectedValue(new Error('activation rejected'));

        await expect(
            acceptMobileDeviceActivation(
                {
                    ...activation,
                    gateway_base_url: plannedEndpoint.gateway_base_url,
                    gateway_id: null,
                },
                {
                    candidateRegistry: {
                        ...registry(),
                        active_gateway_id: plannedEndpoint.id,
                        remotes: [plannedEndpoint],
                    },
                },
            ),
        ).rejects.toMatchObject({ code: 'activation_failed' });

        expect(mockSaveGatewayRegistry).not.toHaveBeenCalled();
    });

    it('allows HTTPS activation addresses accepted by Gateway setup', async () => {
        mockGatewayAuthDeviceActivate.mockResolvedValue(grant());

        await acceptMobileDeviceActivation({
            ...activation,
            gateway_base_url: 'https://gateway.example/pioneer/',
        });

        expect(mockGatewayAuthDeviceActivate).toHaveBeenCalledWith(
            expect.objectContaining({
                gateway_base_url: 'https://gateway.example/pioneer/',
                credential: canonicalActivationCode,
            }),
        );
    });

    it('continues to allow plaintext activation for loopback endpoints', async () => {
        mockGatewayAuthDeviceActivate.mockResolvedValue(grant());

        await acceptMobileDeviceActivation({
            ...activation,
            gateway_base_url: 'http://127.0.0.1:17878/',
        });

        expect(mockGatewayAuthDeviceActivate).toHaveBeenCalledWith(
            expect.objectContaining({
                gateway_base_url: 'http://127.0.0.1:17878/',
                credential: canonicalActivationCode,
            }),
        );
    });

    it('normalizes grouped lowercase OTP input before exchange', async () => {
        mockGatewayAuthDeviceActivate.mockResolvedValue(grant());

        await acceptMobileDeviceActivation({
            ...activation,
            activation_code: 'k7m4-p9q2',
        });

        expect(mockGatewayAuthDeviceActivate).toHaveBeenCalledWith(
            expect.objectContaining({
                credential: canonicalActivationCode,
            }),
        );
    });

    it('pins a manually entered OTP to the Gateway returned by its one-use grant', async () => {
        mockGatewayAuthDeviceActivate.mockResolvedValue(grant());

        const result = await acceptMobileDeviceActivation({
            ...activation,
            gateway_id: null,
        });

        expect(result.endpoint.server_gateway_id).toBe(gatewayId);
        expect(mockWriteMobileGatewaySession).toHaveBeenCalledWith(
            `activated-${gatewayId}`,
            expect.objectContaining({ gateway_id: gatewayId }),
        );
    });

    it('rejects a pinned Gateway mismatch before any exchange', async () => {
        await expect(
            acceptMobileDeviceActivation(activation, {
                pinnedGatewayId: 'G99999999999999999999',
            }),
        ).rejects.toMatchObject({
            code: 'gateway_mismatch',
        });
        expect(mockGatewayAuthDeviceActivate).not.toHaveBeenCalled();
    });

    it('rejects an gateway_base_url already pinned to another Gateway before exchange', async () => {
        mockLoadGatewayRegistry.mockReturnValue({
            ...registry(),
            remotes: [
                {
                    id: 'remote-existing',
                    name: 'Existing Gateway',
                    gateway_base_url: activation.gateway_base_url,
                    kind: 'remote',
                    session_ref: 'remote-existing',
                    server_gateway_id: 'G99999999999999999999',
                    service_name: null,
                    workspace_id: null,
                },
            ],
        });

        await expect(acceptMobileDeviceActivation(activation)).rejects.toMatchObject({
            code: 'gateway_mismatch',
        });
        expect(mockGatewayAuthDeviceActivate).not.toHaveBeenCalled();
    });

    it('rejects an activation that would merge distinct Gateway and gateway_base_url bindings', async () => {
        mockLoadGatewayRegistry.mockReturnValue({
            ...registry(),
            remotes: [
                {
                    id: 'gateway-match',
                    name: 'Known Gateway',
                    gateway_base_url: 'https://old-gateway.example/',
                    kind: 'remote',
                    session_ref: 'gateway-match',
                    server_gateway_id: gatewayId,
                    service_name: null,
                    workspace_id: null,
                },
                {
                    id: 'gateway_base_url-match',
                    name: 'Unbound gateway_base_url',
                    gateway_base_url: activation.gateway_base_url,
                    kind: 'remote',
                    session_ref: null,
                    server_gateway_id: null,
                    service_name: null,
                    workspace_id: null,
                },
            ],
        });

        await expect(acceptMobileDeviceActivation(activation)).rejects.toMatchObject({
            code: 'gateway_mismatch',
        });
        expect(mockGatewayAuthDeviceActivate).not.toHaveBeenCalled();
    });

    it('persists the refresh envelope before committing a secret-free registry', async () => {
        const order: string[] = [];
        const sessionGrant = grant();
        mockGatewayAuthDeviceActivate.mockResolvedValue(sessionGrant);
        mockWriteMobileGatewaySession.mockImplementation(async () => {
            order.push('secure_store');
        });
        mockSaveGatewayRegistry.mockImplementation((next: GatewayRegistry) => {
            order.push('registry');
            const snapshot = JSON.stringify(next);
            expect(snapshot).not.toContain('access_direct_only');
            expect(snapshot).not.toContain('prf2_');
            expect(snapshot).not.toContain(activationCode);
        });

        const result = await acceptMobileDeviceActivation(activation);

        expect(order).toEqual(['secure_store', 'registry']);
        expect(result.registry.active_gateway_id).toBe(result.endpoint.id);
        expect(result.endpoint.server_gateway_id).toBe(gatewayId);
        expect(sessionGrant.access_token).toBe('');
        expect(sessionGrant.refresh_token).toBe('');
        expect(activationMetadataWrites).not.toHaveLength(0);
        for (const value of activationMetadataWrites) {
            expect(value).not.toContain(activationCode);
            expect(value).not.toContain('prf2_');
            expect(value).not.toContain('access_direct_only');
        }
    });

    it('preserves an existing local endpoint kind when activation attaches its session', async () => {
        const local = {
            id: 'local',
            name: 'Local Gateway',
            gateway_base_url: activation.gateway_base_url,
            kind: 'local' as const,
            session_ref: null,
            server_gateway_id: null,
            service_name: null,
            workspace_id: null,
        };
        const currentRegistry: GatewayRegistry = {
            ...registry(),
            local,
        };
        mockLoadGatewayRegistry.mockReturnValue(currentRegistry);
        mockFindGatewayEndpoint.mockReturnValue(local);
        mockReplaceGatewayEndpoint.mockImplementation((value, endpoint) => ({
            ...value,
            local: endpoint,
        }));
        mockGatewayAuthDeviceActivate.mockResolvedValue(grant());

        const result = await acceptMobileDeviceActivation(activation);

        expect(result.endpoint.kind).toBe('local');
        expect(result.registry.local?.kind).toBe('local');
        expect(result.registry.remotes).toEqual([]);
    });

    it('continues activation recovery when one MMKV journal cannot be read', async () => {
        const unreadableGatewayId = 'G00000000000000000002';
        const recoverableGatewayId = 'G00000000000000000003';
        const unreadableKey = `pioneer.gateway.device-activation-commit.v1.${unreadableGatewayId}`;
        const recoverableKey = `pioneer.gateway.device-activation-commit.v1.${recoverableGatewayId}`;
        const endpoint = {
            id: `activated-${recoverableGatewayId}`,
            name: 'Recovered Gateway',
            gateway_base_url: 'https://recovered.example/',
            kind: 'remote' as const,
            session_ref: `activated-${recoverableGatewayId}`,
            server_gateway_id: recoverableGatewayId,
            service_name: null,
            workspace_id: null,
        };
        activationMetadata.set(unreadableKey, 'unreadable');
        activationMetadata.set(
            recoverableKey,
            JSON.stringify({
                schema_version: 1,
                gateway_id: recoverableGatewayId,
                endpoint_id: endpoint.id,
                session_ref: endpoint.session_ref,
                endpoint,
                previous_session_id: null,
            }),
        );
        mockStorageGetString.mockImplementation((key) => {
            if (key === unreadableKey) {
                throw new Error('injected MMKV read failure');
            }
            return activationMetadata.get(key);
        });
        mockReadMobileGatewaySession.mockResolvedValue({
            schema_version: 2,
            gateway_id: recoverableGatewayId,
            principal_id: 'P00000000000000000001',
            device_id: 'D00000000000000000001',
            session_id: 'S00000000000000000001',
            token_family_id: 'F00000000000000000001',
            installation_id: 'installation-mobile-1',
            refresh_generation: 0,
            refresh_expires_at_unix: 1_900_000_000,
            refresh_token: `prf2_${'r'.repeat(164)}`,
        });

        const recovered = await recoverPendingMobileDeviceActivationCommits();

        expect(recovered.remotes).toEqual([endpoint]);
        expect(recovered.active_gateway_id).toBe(endpoint.id);
        expect(activationMetadata.has(unreadableKey)).toBe(true);
        expect(activationMetadata.has(recoverableKey)).toBe(false);
    });

    it('removes legacy candidate Gateways that were persisted before authentication', async () => {
        const unboundEndpoint = {
            id: 'remote-unbound',
            name: 'Never authenticated',
            gateway_base_url: 'http://192.0.2.10:17878/',
            kind: 'remote' as const,
            session_ref: null,
            server_gateway_id: null,
            service_name: null,
            workspace_id: null,
        };
        mockLoadGatewayRegistry.mockReturnValue({
            ...registry(),
            active_gateway_id: unboundEndpoint.id,
            remotes: [unboundEndpoint],
        });

        const recovered = await recoverPendingMobileDeviceActivationCommits();

        expect(recovered.active_gateway_id).toBeNull();
        expect(recovered.remotes).toEqual([]);
        expect(mockSaveGatewayRegistry).toHaveBeenCalledWith(recovered);
    });

    it('keeps a durable session recoverable when registry persistence fails', async () => {
        const sessionGrant = grant();
        let durableEnvelope: Parameters<typeof writeMobileGatewaySession>[1] | null = null;
        mockGatewayAuthDeviceActivate.mockResolvedValue(sessionGrant);
        mockWriteMobileGatewaySession.mockImplementation(async (_sessionRef, envelope) => {
            durableEnvelope = envelope;
        });
        mockSaveGatewayRegistry
            .mockImplementationOnce(() => {
                throw new Error('injected registry failure');
            })
            .mockImplementationOnce(() => undefined);

        await expect(acceptMobileDeviceActivation(activation)).rejects.toMatchObject({
            code: 'storage_failed',
        });

        expect(mockGatewayAuthSessionCleanup).not.toHaveBeenCalled();
        expect(mockDeleteMobileGatewaySession).not.toHaveBeenCalled();
        expect(sessionGrant.access_token).toBe('');
        expect(sessionGrant.refresh_token).toBe('');

        mockReadMobileGatewaySession.mockResolvedValueOnce(durableEnvelope);
        const recovered = await acceptMobileDeviceActivation(activation);

        expect(recovered.endpoint.server_gateway_id).toBe(gatewayId);
        expect(mockGatewayAuthDeviceActivate).toHaveBeenCalledTimes(1);
    });

    it('does not rebind a durable activation result to a different endpoint', async () => {
        const sessionGrant = grant();
        let durableEnvelope: Parameters<typeof writeMobileGatewaySession>[1] | null = null;
        mockGatewayAuthDeviceActivate.mockResolvedValue(sessionGrant);
        mockWriteMobileGatewaySession.mockImplementation(async (_sessionRef, envelope) => {
            durableEnvelope = envelope;
        });
        mockSaveGatewayRegistry.mockImplementationOnce(() => {
            throw new Error('injected registry failure');
        });

        await expect(acceptMobileDeviceActivation(activation)).rejects.toMatchObject({
            code: 'storage_failed',
        });

        mockReadMobileGatewaySession.mockResolvedValue(durableEnvelope);
        await expect(
            acceptMobileDeviceActivation({
                ...activation,
                gateway_base_url: 'https://attacker.example/',
            }),
        ).rejects.toMatchObject({
            code: 'gateway_mismatch',
        });
        expect(mockGatewayAuthDeviceActivate).toHaveBeenCalledTimes(1);
    });

    it('recovers a new durable activation during hydration without replaying the one-use grant', async () => {
        const sessionGrant = grant();
        let durableEnvelope: Parameters<typeof writeMobileGatewaySession>[1] | null = null;
        mockGatewayAuthDeviceActivate.mockResolvedValue(sessionGrant);
        mockWriteMobileGatewaySession.mockImplementation(async (_sessionRef, envelope) => {
            durableEnvelope = envelope;
        });
        mockSaveGatewayRegistry.mockImplementationOnce(() => {
            throw new Error('injected registry failure');
        });

        await expect(acceptMobileDeviceActivation(activation)).rejects.toMatchObject({
            code: 'storage_failed',
        });

        expect(durableEnvelope).not.toBeNull();
        mockReadMobileGatewaySession.mockResolvedValue(durableEnvelope);
        mockSaveGatewayRegistry.mockImplementation(() => undefined);

        const recovered = await recoverPendingMobileDeviceActivationCommits();

        expect(recovered.remotes).toEqual([
            expect.objectContaining({
                id: `activated-${gatewayId}`,
                gateway_base_url: activation.gateway_base_url,
                session_ref: `activated-${gatewayId}`,
                server_gateway_id: gatewayId,
            }),
        ]);
        expect(recovered.active_gateway_id).toBe(`activated-${gatewayId}`);
        expect(mockGatewayAuthDeviceActivate).toHaveBeenCalledTimes(1);
        expect(activationMetadata.size).toBe(0);
    });

    it('recovers a durable activation commit for an existing endpoint', async () => {
        const existingEndpoint = {
            id: `activated-${gatewayId}`,
            name: 'Activated Gateway',
            gateway_base_url: activation.gateway_base_url,
            kind: 'remote' as const,
            session_ref: `activated-${gatewayId}`,
            server_gateway_id: gatewayId,
            service_name: null,
            workspace_id: null,
        };
        const durable = {
            schema_version: 2 as const,
            gateway_id: gatewayId,
            principal_id: 'P00000000000000000001',
            device_id: 'D00000000000000000001',
            session_id: 'S00000000000000000001',
            token_family_id: 'F00000000000000000001',
            installation_id: 'installation-mobile-1',
            refresh_generation: 0,
            refresh_expires_at_unix: 1_900_000_000,
            refresh_token: `prf2_${'r'.repeat(164)}`,
        };
        mockLoadGatewayRegistry.mockReturnValue({
            ...registry(),
            remotes: [existingEndpoint],
        });
        mockReadMobileGatewaySession.mockResolvedValue(durable);
        activationMetadata.set(
            `pioneer.gateway.device-activation-commit.v1.${gatewayId}`,
            JSON.stringify({
                schema_version: 1,
                gateway_id: gatewayId,
                endpoint_id: existingEndpoint.id,
                session_ref: existingEndpoint.session_ref,
                endpoint: existingEndpoint,
                previous_session_id: null,
            }),
        );

        const recovered = await acceptMobileDeviceActivation(activation);

        expect(recovered.endpoint.id).toBe(existingEndpoint.id);
        expect(mockGatewayAuthDeviceActivate).not.toHaveBeenCalled();
        expect(mockSaveGatewayRegistry).toHaveBeenCalledTimes(1);
    });

    it('does not recover a durable session onto an endpoint whose gateway_base_url changed', async () => {
        const committedEndpoint = {
            id: `activated-${gatewayId}`,
            name: 'Activated Gateway',
            gateway_base_url: activation.gateway_base_url,
            kind: 'remote' as const,
            session_ref: `activated-${gatewayId}`,
            server_gateway_id: gatewayId,
            service_name: null,
            workspace_id: null,
        };
        const changedEndpoint = {
            ...committedEndpoint,
            gateway_base_url: 'https://attacker.example/',
        };
        mockLoadGatewayRegistry.mockReturnValue({
            ...registry(),
            remotes: [changedEndpoint],
        });
        mockFindGatewayEndpoint.mockReturnValue(changedEndpoint);
        mockReadMobileGatewaySession.mockResolvedValue({
            schema_version: 2,
            gateway_id: gatewayId,
            principal_id: 'P00000000000000000001',
            device_id: 'D00000000000000000001',
            session_id: 'S00000000000000000001',
            token_family_id: 'F00000000000000000001',
            installation_id: 'installation-mobile-1',
            refresh_generation: 0,
            refresh_expires_at_unix: 1_900_000_000,
            refresh_token: `prf2_${'r'.repeat(164)}`,
        });
        activationMetadata.set(
            `pioneer.gateway.device-activation-commit.v1.${gatewayId}`,
            JSON.stringify({
                schema_version: 1,
                gateway_id: gatewayId,
                endpoint_id: committedEndpoint.id,
                session_ref: committedEndpoint.session_ref,
                endpoint: committedEndpoint,
                previous_session_id: null,
            }),
        );

        const recovered = await recoverPendingMobileDeviceActivationCommits();

        expect(recovered.remotes).toEqual([changedEndpoint]);
        expect(mockSaveGatewayRegistry).not.toHaveBeenCalled();
        expect(mockStorageRemove).not.toHaveBeenCalled();
    });

    it('recovers onto an unbound endpoint whose optional binding fields were omitted', async () => {
        const committedEndpoint = {
            id: `activated-${gatewayId}`,
            name: 'Activated Gateway',
            gateway_base_url: activation.gateway_base_url,
            kind: 'remote' as const,
            session_ref: `activated-${gatewayId}`,
            server_gateway_id: gatewayId,
            service_name: null,
            workspace_id: null,
        };
        const unboundEndpoint = {
            id: committedEndpoint.id,
            name: committedEndpoint.name,
            gateway_base_url: committedEndpoint.gateway_base_url,
            kind: committedEndpoint.kind,
        };
        mockLoadGatewayRegistry.mockReturnValue({
            ...registry(),
            remotes: [unboundEndpoint],
        });
        mockFindGatewayEndpoint.mockReturnValue(unboundEndpoint);
        mockReadMobileGatewaySession.mockResolvedValue({
            schema_version: 2,
            gateway_id: gatewayId,
            principal_id: 'P00000000000000000001',
            device_id: 'D00000000000000000001',
            session_id: 'S00000000000000000001',
            token_family_id: 'F00000000000000000001',
            installation_id: 'installation-mobile-1',
            refresh_generation: 0,
            refresh_expires_at_unix: 1_900_000_000,
            refresh_token: `prf2_${'r'.repeat(164)}`,
        });
        activationMetadata.set(
            `pioneer.gateway.device-activation-commit.v1.${gatewayId}`,
            JSON.stringify({
                schema_version: 1,
                gateway_id: gatewayId,
                endpoint_id: committedEndpoint.id,
                session_ref: committedEndpoint.session_ref,
                endpoint: committedEndpoint,
                previous_session_id: null,
            }),
        );

        const recovered = await recoverPendingMobileDeviceActivationCommits();

        expect(recovered.remotes).toEqual([
            expect.objectContaining({
                ...unboundEndpoint,
                session_ref: committedEndpoint.session_ref,
                server_gateway_id: gatewayId,
            }),
        ]);
        expect(mockSaveGatewayRegistry).toHaveBeenCalledTimes(1);
        expect(mockStorageRemove).toHaveBeenCalled();
    });

    it('does not overwrite a newer endpoint session binding during journal recovery', async () => {
        const committedEndpoint = {
            id: `activated-${gatewayId}`,
            name: 'Activated Gateway',
            gateway_base_url: activation.gateway_base_url,
            kind: 'remote' as const,
            session_ref: `activated-${gatewayId}`,
            server_gateway_id: gatewayId,
            service_name: null,
            workspace_id: null,
        };
        const newerEndpoint = {
            ...committedEndpoint,
            session_ref: 'newer-mobile-session',
        };
        mockLoadGatewayRegistry.mockReturnValue({
            ...registry(),
            remotes: [newerEndpoint],
        });
        mockFindGatewayEndpoint.mockReturnValue(newerEndpoint);
        mockReadMobileGatewaySession.mockResolvedValue({
            schema_version: 2,
            gateway_id: gatewayId,
            principal_id: 'P00000000000000000001',
            device_id: 'D00000000000000000001',
            session_id: 'S00000000000000000001',
            token_family_id: 'F00000000000000000001',
            installation_id: 'installation-mobile-1',
            refresh_generation: 0,
            refresh_expires_at_unix: 1_900_000_000,
            refresh_token: `prf2_${'r'.repeat(164)}`,
        });
        activationMetadata.set(
            `pioneer.gateway.device-activation-commit.v1.${gatewayId}`,
            JSON.stringify({
                schema_version: 1,
                gateway_id: gatewayId,
                endpoint_id: committedEndpoint.id,
                session_ref: committedEndpoint.session_ref,
                endpoint: committedEndpoint,
                previous_session_id: null,
            }),
        );

        const recovered = await recoverPendingMobileDeviceActivationCommits();

        expect(recovered.remotes).toEqual([newerEndpoint]);
        expect(mockSaveGatewayRegistry).not.toHaveBeenCalled();
        expect(mockStorageRemove).not.toHaveBeenCalled();
    });

    it('rejects journals with legacy nullable endpoints or unknown secret fields', async () => {
        const key = `pioneer.gateway.device-activation-commit.v1.${gatewayId}`;
        for (const invalid of [
            {
                schema_version: 1,
                gateway_id: gatewayId,
                endpoint_id: `activated-${gatewayId}`,
                session_ref: `activated-${gatewayId}`,
                endpoint: null,
                previous_session_id: null,
            },
            {
                schema_version: 1,
                gateway_id: gatewayId,
                endpoint_id: `activated-${gatewayId}`,
                session_ref: `activated-${gatewayId}`,
                endpoint: {
                    id: `activated-${gatewayId}`,
                    name: 'Activated Gateway',
                    gateway_base_url: activation.gateway_base_url,
                    kind: 'remote',
                    session_ref: `activated-${gatewayId}`,
                    server_gateway_id: gatewayId,
                    service_name: null,
                    workspace_id: null,
                },
                previous_session_id: null,
                activation_code: activationCode,
            },
        ]) {
            activationMetadata.set(key, JSON.stringify(invalid));
            await recoverPendingMobileDeviceActivationCommits();
            expect(activationMetadata.has(key)).toBe(false);
        }
        expect(mockSaveGatewayRegistry).not.toHaveBeenCalled();
    });

    it('does not mistake an existing terminal envelope for a new activation result', async () => {
        const existingEndpoint = {
            id: 'remote-1',
            name: 'Remote',
            gateway_base_url: activation.gateway_base_url,
            kind: 'remote' as const,
            session_ref: 'remote-1',
            server_gateway_id: gatewayId,
            service_name: null,
            workspace_id: null,
        };
        mockLoadGatewayRegistry.mockReturnValue({
            ...registry(),
            active_gateway_id: existingEndpoint.id,
            remotes: [existingEndpoint],
        });
        mockFindGatewayEndpoint.mockReturnValue(existingEndpoint);
        mockReadMobileGatewaySession.mockResolvedValue({
            schema_version: 2,
            gateway_id: gatewayId,
            principal_id: 'P00000000000000000001',
            device_id: 'D00000000000000000099',
            session_id: 'S00000000000000000099',
            token_family_id: 'F00000000000000000099',
            installation_id: 'installation-mobile-1',
            refresh_generation: 4,
            refresh_expires_at_unix: 1_800_000_000,
            refresh_token: `prf2_${'o'.repeat(164)}`,
        });
        mockGatewayAuthDeviceActivate.mockResolvedValue(grant());

        await acceptMobileDeviceActivation(activation);

        expect(mockGatewayAuthDeviceActivate).toHaveBeenCalledTimes(1);
        expect(mockWriteMobileGatewaySession).toHaveBeenCalledWith(
            existingEndpoint.session_ref,
            expect.objectContaining({ session_id: 'S00000000000000000001' }),
        );
    });

    it('uses the shared QR presentation for a newly created pending device session', async () => {
        const createdDevice = {
            device_id: 'D00000000000000000002',
            session_id: 'S00000000000000000002',
            activation_code: activationCode,
            gateway_id: gatewayId,
            expires_at_unix: 1_800_000_000,
        };
        mockGatewayAuthDeviceCreate.mockResolvedValue(createdDevice);
        mockGatewayDeviceActivationPresentation.mockResolvedValue({
            device_id: createdDevice.device_id,
            session_id: createdDevice.session_id,
            gateway_id: gatewayId,
            gateway_base_url: activation.gateway_base_url,
            expires_at_unix: createdDevice.expires_at_unix,
            manual_code: activationCode,
            deep_link: 'pioneer://activate?[redacted-for-test]',
            qr_width: 21,
            qr_modules: [],
        });

        await createMobileDeviceActivationPresentation({
            id: 'remote-1',
            name: 'Remote',
            gateway_base_url: activation.gateway_base_url,
            kind: 'remote',
            session_ref: 'remote-1',
            server_gateway_id: gatewayId,
            service_name: null,
            workspace_id: null,
        });

        expect(mockGatewayDeviceActivationPresentation).toHaveBeenCalledWith({
            gateway_base_url: activation.gateway_base_url,
            created_device: createdDevice,
        });
    });

    it('marks current revoke terminal even when SecureStore deletion fails', async () => {
        mockFindGatewayEndpoint.mockReturnValue({
            id: 'remote-1',
            name: 'Remote',
            gateway_base_url: activation.gateway_base_url,
            kind: 'remote',
            session_ref: 'remote-1',
            server_gateway_id: gatewayId,
            service_name: null,
            workspace_id: null,
        });
        mockDeleteMobileGatewaySession.mockRejectedValueOnce(new Error('delete failed'));

        await expect(
            revokeMobileGatewaySession('remote-1', 'S00000000000000000001', true),
        ).rejects.toMatchObject({ code: 'storage_failed' });

        expect(mockMarkMobileGatewaySessionTerminal).toHaveBeenCalledWith(
            'remote-1',
            'session_revoked',
        );
    });

    it('marks logout terminal even when SecureStore deletion fails', async () => {
        const endpoint = {
            id: 'remote-1',
            name: 'Remote',
            gateway_base_url: activation.gateway_base_url,
            kind: 'remote' as const,
            session_ref: 'remote-1',
            server_gateway_id: gatewayId,
            service_name: null,
            workspace_id: null,
        };
        mockDeleteMobileGatewaySession.mockRejectedValueOnce(new Error('delete failed'));

        await expect(logoutMobileGatewaySession(endpoint)).rejects.toMatchObject({
            code: 'storage_failed',
        });

        expect(mockMarkMobileGatewaySessionTerminal).toHaveBeenCalledWith(
            'remote-1',
            'session_revoked',
        );
    });
});

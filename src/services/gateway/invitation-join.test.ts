/* eslint-disable import/first */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/client', () => ({
    pioneerClient: {
        invitationPresentation: jest.fn(),
        gatewayPlanAddAndActivateRemoteRegistry: jest.fn(),
        invitationAccept: jest.fn(),
        invitationCommitTakeRefresh: jest.fn(),
        invitationCommitSecureStorageCommitted: jest.fn(),
        invitationCommitRegistryCommitted: jest.fn(),
        invitationCommitRegistryFailed: jest.fn(),
        invitationCommitSecureStorageFailed: jest.fn(),
    },
}));
jest.mock('@/stores/gateway', () => ({
    useGatewayStore: {
        getState: jest.fn(),
    },
}));
jest.mock('./registry', () => ({
    findGatewayEndpoint: jest.fn(),
    loadGatewayRegistry: jest.fn(),
    replaceGatewayEndpoint: jest.fn(),
    saveGatewayRegistry: jest.fn(),
}));
jest.mock('./session-grant', () => ({
    mobileAuthInstallation: jest.fn((installationId: string) => ({
        installation_id: installationId,
        display_name: 'Phone',
        client_kind: 'mobile',
        platform: 'ios',
        client_version: '1',
    })),
}));
jest.mock('./session-storage', () => ({
    MOBILE_GATEWAY_SESSION_SCHEMA_VERSION: 2,
    deleteMobileGatewaySession: jest.fn(),
    writeMobileGatewaySession: jest.fn(),
}));
jest.mock('./session-coordinator', () => ({
    clearMobileGatewaySessionRuntime: jest.fn(),
}));

import { pioneerClient } from '@/client';
import type { GatewayEndpoint, GatewayRegistry } from '@/client';
import { useGatewayStore } from '@/stores/gateway';
import {
    findGatewayEndpoint,
    loadGatewayRegistry,
    replaceGatewayEndpoint,
    saveGatewayRegistry,
} from './registry';
import { clearMobileGatewaySessionRuntime } from './session-coordinator';
import { deleteMobileGatewaySession, writeMobileGatewaySession } from './session-storage';
import {
    MobileInvitationJoinError,
    acceptMobileInvitation,
    resetPendingMobileInvitationRecoveryForTests,
} from './invitation-join';

const gatewayId = 'G00000000000000000001';
const principalId = 'P00000000000000000001';
const deviceId = 'D00000000000000000001';
const sessionId = 'S00000000000000000001';
const endpoint: GatewayEndpoint = {
    id: 'remote-invite',
    name: 'Pioneer Gateway',
    gateway_base_url: 'https://gateway.example/',
    kind: 'remote',
    session_ref: null,
    server_gateway_id: null,
    workspace_id: null,
    service_name: null,
};
const registry = (): GatewayRegistry => ({
    version: 3,
    installation_id: 'installation-mobile-1',
    active_gateway_id: 'existing',
    local: null,
    remotes: [
        {
            ...endpoint,
            id: 'existing',
            session_ref: 'existing',
            server_gateway_id: 'G00000000000000000002',
        },
    ],
});

describe('mobile invitation durable commit', () => {
    const calls: string[] = [];
    const setRegistry = jest.fn();
    const bumpSessionRevision = jest.fn();

    beforeEach(() => {
        jest.resetAllMocks();
        resetPendingMobileInvitationRecoveryForTests();
        calls.length = 0;
        jest.mocked(loadGatewayRegistry).mockReturnValue(registry());
        jest.mocked(findGatewayEndpoint).mockImplementation(
            (value, id) => (value.remotes ?? []).find((candidate) => candidate.id === id) ?? null,
        );
        jest.mocked(replaceGatewayEndpoint).mockImplementation((value, replacement) => ({
            ...value,
            remotes: (value.remotes ?? []).map((candidate) =>
                candidate.id === replacement.id ? replacement : candidate,
            ),
        }));
        jest.mocked(useGatewayStore.getState).mockReturnValue({
            setRegistry,
            bumpSessionRevision,
        } as never);
        jest.mocked(clearMobileGatewaySessionRuntime).mockResolvedValue(undefined);
        jest.mocked(deleteMobileGatewaySession).mockResolvedValue(undefined);
        jest.mocked(pioneerClient.invitationCommitRegistryFailed).mockResolvedValue({
            released: true,
            cleanup_attempted: false,
        });
        jest.mocked(pioneerClient.invitationCommitSecureStorageFailed).mockResolvedValue({
            released: true,
            cleanup_attempted: true,
        });
        jest.mocked(pioneerClient.invitationPresentation).mockResolvedValue({
            gateway_base_url: endpoint.gateway_base_url,
            gateway_id: gatewayId,
            transport_security: 'secure_wss',
            canonical_uri: '[redacted]',
            qr_payload: '[redacted]',
            qr_modules: [true],
            qr_width: 1,
        });
        jest.mocked(pioneerClient.gatewayPlanAddAndActivateRemoteRegistry).mockResolvedValue({
            registry: { ...registry(), remotes: [...(registry().remotes ?? []), endpoint] },
            endpoint,
            previous_active_gateway_id: 'existing',
        });
        jest.mocked(pioneerClient.invitationAccept).mockImplementation(async () => {
            calls.push('accept');
            return { commit_id: 'invitation_commit_1', state: 'refresh_ready' };
        });
        jest.mocked(pioneerClient.invitationCommitTakeRefresh).mockImplementation(async () => {
            calls.push('take_refresh');
            return {
                gateway_id: gatewayId,
                principal_id: principalId,
                device_id: deviceId,
                session_id: sessionId,
                token_family_id: 'F00000000000000000001',
                installation_id: 'installation-mobile-1',
                client_kind: 'mobile',
                refresh_generation: 0,
                refresh_expires_at_unix: 2_000_000_000,
                refresh_token: `prf2_${'r'.repeat(164)}`,
            };
        });
        jest.mocked(writeMobileGatewaySession).mockImplementation(async () => {
            calls.push('secure_store');
        });
        jest.mocked(pioneerClient.invitationCommitSecureStorageCommitted).mockImplementation(
            async () => {
                calls.push('secure_committed');
                return {
                    gateway_id: gatewayId,
                    principal_id: principalId,
                    device_id: deviceId,
                    session_id: sessionId,
                    member: {} as never,
                    workspace_ids: ['W00000000000000000001'],
                };
            },
        );
        jest.mocked(saveGatewayRegistry).mockImplementation((value) => {
            calls.push(value.active_gateway_id === endpoint.id ? 'save_active' : 'save_staged');
        });
        jest.mocked(pioneerClient.invitationCommitRegistryCommitted).mockImplementation(
            async () => {
                calls.push('registry_committed');
                return {
                    gateway_id: gatewayId,
                    principal_id: principalId,
                    device_id: deviceId,
                    session_id: sessionId,
                    access_expires_at_unix: 1_900_000_000,
                    access_token: 'access-secret',
                };
            },
        );
    });

    it('persists refresh and registry before publishing the new active Gateway', async () => {
        await acceptMobileInvitation({
            uri: 'pioneer://invite#secret',
            profile: { display_name: 'Member', nickname: 'member', avatar: null },
        });

        expect(calls).toEqual([
            'accept',
            'take_refresh',
            'secure_store',
            'secure_committed',
            'save_staged',
            'registry_committed',
            'save_active',
        ]);
        expect(setRegistry).toHaveBeenCalledWith(
            expect.objectContaining({ active_gateway_id: endpoint.id }),
        );
        expect(bumpSessionRevision).toHaveBeenCalledTimes(1);
        expect(registry().active_gateway_id).toBe('existing');
    });

    it('uses the existing cleanup capability when SecureStore fails', async () => {
        jest.mocked(writeMobileGatewaySession).mockRejectedValueOnce(new Error('injected'));

        await expect(
            acceptMobileInvitation({
                uri: 'pioneer://invite#secret',
                profile: { display_name: 'Member', nickname: 'member', avatar: null },
            }),
        ).rejects.toBeInstanceOf(MobileInvitationJoinError);
        expect(pioneerClient.invitationCommitSecureStorageFailed).toHaveBeenCalledTimes(1);
        expect(saveGatewayRegistry).not.toHaveBeenCalled();
        expect(setRegistry).not.toHaveBeenCalled();
    });

    it('retries a durable-unbound registry write without accepting twice', async () => {
        jest.mocked(saveGatewayRegistry).mockImplementationOnce(() => {
            throw new Error('injected registry failure');
        });

        const input = {
            uri: 'pioneer://invite#secret',
            profile: { display_name: 'Member', nickname: 'member', avatar: null },
        };
        await expect(acceptMobileInvitation(input)).rejects.toBeInstanceOf(
            MobileInvitationJoinError,
        );
        await expect(acceptMobileInvitation(input)).resolves.toMatchObject({ id: endpoint.id });

        expect(pioneerClient.invitationAccept).toHaveBeenCalledTimes(1);
        expect(pioneerClient.invitationCommitRegistryFailed).toHaveBeenCalledTimes(1);
        expect(saveGatewayRegistry).toHaveBeenCalledTimes(3);
        expect(setRegistry).toHaveBeenCalledTimes(1);
    });
});

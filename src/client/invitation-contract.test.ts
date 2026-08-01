import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getPioneerClientNitro } from '@pioneer/client-nitro';

import { pioneerClient } from './index';

jest.mock('@pioneer/client-nitro', () => ({
    getPioneerClientNitro: jest.fn(),
}));

const ok = (value: unknown) => JSON.stringify({ status: 'ok', value });

describe('mobile invitation contract', () => {
    const nitro = {
        invitationPresentationJson: jest.fn<(input: string) => Promise<string>>(),
        invitationAcceptJson: jest.fn<(input: string) => Promise<string>>(),
        invitationCommitTakeRefreshJson: jest.fn<(input: string) => Promise<string>>(),
        invitationCommitSecureStorageCommittedJson: jest.fn<(input: string) => Promise<string>>(),
        invitationCommitRegistryCommittedJson: jest.fn<(input: string) => Promise<string>>(),
        invitationCommitSecureStorageFailedJson: jest.fn<(input: string) => Promise<string>>(),
        gatewayNextEventsJson: jest.fn<() => Promise<string>>(),
    };

    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(getPioneerClientNitro).mockReturnValue(nitro as never);
    });

    it('keeps invitation and session secrets on direct calls in durable commit order', async () => {
        const invitationToken = `pinv1_${'A'.repeat(43)}`;
        const uri =
            'pioneer://invite?gateway=wss%3A%2F%2Fgateway.example%2Fws' +
            `&gateway_id=G00000000000000000001#token=${invitationToken}`;
        nitro.invitationPresentationJson.mockResolvedValue(
            ok({
                canonical_uri: uri,
                gateway_id: 'G00000000000000000001',
                protected_endpoint: 'wss://gateway.example/ws',
                qr_payload: uri,
                transport_security: 'secure_wss',
            }),
        );
        nitro.invitationAcceptJson.mockResolvedValue(
            ok({ commit_id: 'invitation-commit-1', state: 'refresh_ready' }),
        );
        nitro.invitationCommitTakeRefreshJson.mockResolvedValue(
            ok({
                client_kind: 'mobile',
                device_id: 'D00000000000000000001',
                gateway_id: 'G00000000000000000001',
                installation_id: 'installation-1',
                principal_id: 'P00000000000000000001',
                refresh_expires_at_unix: 1_900_000_000,
                refresh_generation: 0,
                refresh_token: 'prf_direct_invitation_refresh',
                session_id: 'S00000000000000000001',
                token_family_id: 'F00000000000000000001',
            }),
        );
        nitro.invitationCommitSecureStorageCommittedJson.mockResolvedValue(
            ok({
                device_id: 'D00000000000000000001',
                gateway_id: 'G00000000000000000001',
                member: {
                    display_name: 'Member',
                    kind: 'user',
                    nickname: 'member',
                    principal_id: 'P00000000000000000001',
                    role_key: 'member',
                    status: 'active',
                },
                principal_id: 'P00000000000000000001',
                session_id: 'S00000000000000000001',
                workspace_ids: ['W00000000000000000001'],
            }),
        );
        nitro.invitationCommitRegistryCommittedJson.mockResolvedValue(
            ok({
                access_expires_at_unix: 1_800_000_000,
                access_token: 'access_direct_invitation',
                device_id: 'D00000000000000000001',
                gateway_id: 'G00000000000000000001',
                principal_id: 'P00000000000000000001',
                session_id: 'S00000000000000000001',
            }),
        );

        const presentation = await pioneerClient.invitationPresentation({ uri });
        const accepted = await pioneerClient.invitationAccept({
            expected_installation_id: 'installation-1',
            params: {
                installation: {
                    client_kind: 'mobile',
                    display_name: 'Phone',
                    installation_id: 'installation-1',
                },
                profile: { display_name: 'Member', nickname: 'member' },
            },
            uri,
        });
        const commit = { commit_id: accepted.commit_id };
        const refresh = await pioneerClient.invitationCommitTakeRefresh(commit);
        await pioneerClient.invitationCommitSecureStorageCommitted(commit);
        const access = await pioneerClient.invitationCommitRegistryCommitted(commit);

        expect(presentation.qr_payload).toBe(uri);
        expect(refresh.refresh_token).toBe('prf_direct_invitation_refresh');
        expect(access.access_token).toBe('access_direct_invitation');
        expect(nitro.invitationPresentationJson).toHaveBeenCalledWith(
            expect.stringContaining(invitationToken),
        );
        expect(nitro.invitationCommitTakeRefreshJson.mock.invocationCallOrder[0]).toBeLessThan(
            nitro.invitationCommitSecureStorageCommittedJson.mock.invocationCallOrder[0],
        );
        expect(
            nitro.invitationCommitSecureStorageCommittedJson.mock.invocationCallOrder[0],
        ).toBeLessThan(nitro.invitationCommitRegistryCommittedJson.mock.invocationCallOrder[0]);
        expect(nitro.gatewayNextEventsJson).not.toHaveBeenCalled();
    });

    it('releases a failed secure-storage commit without exposing connected state', async () => {
        nitro.invitationCommitSecureStorageFailedJson.mockResolvedValue(
            ok({ cleanup_attempted: true, released: true }),
        );

        const result = await pioneerClient.invitationCommitSecureStorageFailed({
            commit_id: 'invitation-commit-1',
            timeout_ms: 1_000,
        });

        expect(result).toEqual({ cleanup_attempted: true, released: true });
        expect(nitro.invitationCommitSecureStorageFailedJson).toHaveBeenCalledWith(
            JSON.stringify({ commit_id: 'invitation-commit-1', timeout_ms: 1_000 }),
        );
        expect(nitro.invitationCommitRegistryCommittedJson).not.toHaveBeenCalled();
        expect(nitro.gatewayNextEventsJson).not.toHaveBeenCalled();
    });

    it('accepts additive administration events without exposing credentials', async () => {
        nitro.gatewayNextEventsJson.mockResolvedValue(
            ok([
                {
                    GatewayNotification: {
                        kind: 'invitation_changed',
                        params: {
                            invitation_id: 'I00000000000000000001',
                            revision: 1,
                        },
                    },
                },
            ]),
        );

        const events = await pioneerClient.gatewayNextEvents();
        const encoded = JSON.stringify(events);

        expect(encoded).toContain('invitation_changed');
        expect(encoded).not.toContain('pinv1_');
        expect(encoded).not.toContain('refresh_token');
        expect(encoded).not.toContain('access_token');
    });
});

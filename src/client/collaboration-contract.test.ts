import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getPioneerClientNitro } from '@pioneer/client-nitro';

import { pioneerClient, type AuthMeResponse, type AuthorizationCapabilitySnapshot } from './index';

jest.mock('@pioneer/client-nitro', () => ({
    getPioneerClientNitro: jest.fn(),
}));

const ok = (value: unknown): string => JSON.stringify({ status: 'ok', value });

describe('collaboration presentation Nitro contract', () => {
    const nitro = {
        threadParticipantsListJson: jest.fn<(input: string) => Promise<string>>(),
        threadParticipantAddJson: jest.fn<(input: string) => Promise<string>>(),
        threadParticipantRemoveJson: jest.fn<(input: string) => Promise<string>>(),
        gatewayAuthorizationCapabilitiesJson: jest.fn<(input: string) => Promise<string>>(),
        composerTurnModeOptionsJson: jest.fn<() => string>(),
        principalPresentationCapabilitiesJson: jest.fn<(input: string) => string>(),
        sessionListRowPresentationJson: jest.fn<(input: string) => string>(),
        threadScopeMutationPlanJson: jest.fn<(input: string) => string>(),
        invitationListRowJson: jest.fn<(input: string) => string>(),
        administrationConflictRefetchJson: jest.fn<(input: string) => string>(),
    };

    const auth = {
        principal: { id: 'principal_a', kind: 'user', display_name: 'A', nickname: 'a' },
        role_key: 'member',
    } as AuthMeResponse;
    const capabilitySnapshot = {
        schema_version: 1,
        authorization_revision: 1,
        principal_id: 'principal_a',
        role_key: 'member',
        global: {},
    } as AuthorizationCapabilitySnapshot;

    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(getPioneerClientNitro).mockReturnValue(nitro as never);
    });

    it('delegates existing participant RPCs with exact resource scope', async () => {
        const response = {
            workspace_id: 'workspace_a',
            thread_id: 'thread_a',
            participants: [{ principal_id: 'principal_a' }],
        };
        nitro.threadParticipantsListJson.mockResolvedValue(ok(response));
        nitro.threadParticipantAddJson.mockResolvedValue(ok({ ...response, changed: true }));
        nitro.threadParticipantRemoveJson.mockResolvedValue(ok({ ...response, changed: true }));

        await pioneerClient.threadParticipantsList({
            workspace_id: 'workspace_a',
            thread_id: 'thread_a',
        });
        await pioneerClient.threadParticipantAdd({
            workspace_id: 'workspace_a',
            thread_id: 'thread_a',
            principal_id: 'principal_b',
        });
        await pioneerClient.threadParticipantRemove({
            workspace_id: 'workspace_a',
            thread_id: 'thread_a',
            principal_id: 'principal_b',
        });

        expect(JSON.parse(nitro.threadParticipantsListJson.mock.calls[0][0])).toEqual({
            workspace_id: 'workspace_a',
            thread_id: 'thread_a',
        });
        for (const call of [
            nitro.threadParticipantAddJson.mock.calls[0][0],
            nitro.threadParticipantRemoveJson.mock.calls[0][0],
        ]) {
            expect(JSON.parse(call)).toEqual({
                workspace_id: 'workspace_a',
                thread_id: 'thread_a',
                principal_id: 'principal_b',
            });
        }
    });

    it('keeps capability and mode policy in the shared client', () => {
        nitro.composerTurnModeOptionsJson.mockReturnValue(ok(['Message', 'Agent', 'Chat']));
        nitro.principalPresentationCapabilitiesJson.mockReturnValue(
            ok({
                can_create_invitation: false,
                can_add_workspace_member: true,
                can_manage_member_lifecycle: false,
                can_manage_own_sessions: true,
                can_remove_workspace_member: false,
                can_view_invitations: false,
                can_view_member_directory: true,
            }),
        );
        expect(pioneerClient.composerTurnModeOptions()).toEqual(['Message', 'Agent', 'Chat']);
        expect(
            pioneerClient.principalPresentationCapabilities(capabilitySnapshot)
                .can_manage_own_sessions,
        ).toBe(true);
        expect(JSON.parse(nitro.principalPresentationCapabilitiesJson.mock.calls[0][0])).toEqual(
            capabilitySnapshot,
        );
    });

    it('accepts only the capability snapshot version and scope requested by mobile', async () => {
        nitro.gatewayAuthorizationCapabilitiesJson.mockResolvedValue(
            ok({
                ...capabilitySnapshot,
                workspace: { workspace_id: 'workspace_a', capabilities: {} },
            }),
        );
        await expect(
            pioneerClient.gatewayAuthorizationCapabilities({ workspace_id: 'workspace_a' }),
        ).resolves.toMatchObject({ schema_version: 1, principal_id: 'principal_a' });

        nitro.gatewayAuthorizationCapabilitiesJson.mockResolvedValue(
            ok({ ...capabilitySnapshot, schema_version: 2 }),
        );
        await expect(pioneerClient.gatewayAuthorizationCapabilities({})).rejects.toThrow(
            'incompatible_authorization_capability_snapshot',
        );
    });

    it('keeps session, administration and thread mutation policy behind Nitro', () => {
        const session = {
            current: false,
            device: { id: 'device', status: 'revoked' },
            session: { id: 'session', status: 'revoked' },
        } as never;
        nitro.sessionListRowPresentationJson.mockReturnValue(
            ok({ status: 'revoked', actionable: false }),
        );
        nitro.threadScopeMutationPlanJson.mockReturnValue(
            ok({
                workspace_id: 'workspace_a',
                thread_id: 'thread_a',
                action: { kind: 'update_visibility', visibility: 'private' },
                refetch: ['thread', 'participants', 'workspace_members'],
            }),
        );
        nitro.invitationListRowJson.mockReturnValue(
            ok({ invitation_id: 'invitation_a', status: 'pending', can_revoke: true }),
        );
        nitro.administrationConflictRefetchJson.mockReturnValue(ok([{ kind: 'invitation_list' }]));

        expect(pioneerClient.sessionListRowPresentation(session)).toEqual({
            status: 'revoked',
            actionable: false,
        });
        pioneerClient.threadScopeMutationPlan({
            workspace_id: 'workspace_a',
            thread_id: 'thread_a',
            action: { kind: 'update_visibility', visibility: 'private' },
        });
        pioneerClient.invitationListRow({
            auth,
            capability_snapshot: capabilitySnapshot,
            invitation: { invitation_id: 'invitation_a' } as never,
        });
        expect(pioneerClient.administrationConflictRefetch({ kind: 'create_invitation' })).toEqual([
            { kind: 'invitation_list' },
        ]);

        expect(JSON.parse(nitro.sessionListRowPresentationJson.mock.calls[0][0])).toEqual(session);
        expect(JSON.parse(nitro.threadScopeMutationPlanJson.mock.calls[0][0])).toEqual({
            workspace_id: 'workspace_a',
            thread_id: 'thread_a',
            action: { kind: 'update_visibility', visibility: 'private' },
        });
        expect(JSON.parse(nitro.administrationConflictRefetchJson.mock.calls[0][0])).toEqual({
            kind: 'create_invitation',
        });
    });
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AuthMeResponse, AuthorizationCapabilitySnapshot, MemberSummary } from '@/client';
import { pioneerClient } from '@/client';

import {
    createRecoveryDevicePresentation,
    loadAllMembers,
    loadAllWorkspaceMembers,
    presentMember,
    removeMember,
} from './members';

jest.mock('@/client', () => ({
    pioneerClient: {
        memberList: jest.fn(),
        workspaceMemberList: jest.fn(),
        memberPresentation: jest.fn(),
        memberRemove: jest.fn(),
        memberDeviceCreate: jest.fn(),
        gatewayDeviceActivationPresentation: jest.fn(),
    },
}));

const member = {
    principal_id: 'P0000000000000000000A',
    kind: 'user',
    display_name: 'Alice',
    nickname: 'alice',
    status: 'active',
} satisfies MemberSummary;

describe('mobile member administration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('loads every workspace page without duplicating overlapping members', async () => {
        jest.mocked(pioneerClient.workspaceMemberList)
            .mockResolvedValueOnce({
                workspace_id: 'workspace-a',
                members: [member],
                next_cursor: 'next',
            })
            .mockResolvedValueOnce({
                workspace_id: 'workspace-a',
                members: [member],
                next_cursor: null,
            });
        const result = await loadAllWorkspaceMembers('workspace-a');
        expect(result.members).toEqual([member]);
        expect(pioneerClient.workspaceMemberList).toHaveBeenNthCalledWith(2, {
            workspace_id: 'workspace-a',
            cursor: 'next',
            limit: 100,
        });
    });

    it('loads every ACL-scoped member-directory page for mention candidates', async () => {
        jest.mocked(pioneerClient.memberList)
            .mockResolvedValueOnce({ members: [member], next_cursor: 'next' })
            .mockResolvedValueOnce({ members: [member], next_cursor: null });

        await expect(loadAllMembers()).resolves.toEqual({ members: [member], next_cursor: null });
        expect(pioneerClient.memberList).toHaveBeenNthCalledWith(2, {
            cursor: 'next',
            limit: 50,
        });
    });

    it('accepts a single terminal workspace page', async () => {
        jest.mocked(pioneerClient.workspaceMemberList).mockResolvedValueOnce({
            workspace_id: 'workspace-a',
            members: [member],
            next_cursor: null,
        });

        await expect(loadAllWorkspaceMembers('workspace-a')).resolves.toEqual({
            workspace_id: 'workspace-a',
            members: [member],
            next_cursor: null,
        });
    });

    it('delegates row action policy and optimistic concurrency to shared/native owners', async () => {
        const auth = {} as AuthMeResponse;
        const capabilitySnapshot = {} as AuthorizationCapabilitySnapshot;
        jest.mocked(pioneerClient.memberPresentation).mockReturnValue({ actions: {} } as never);
        presentMember(auth, capabilitySnapshot, member, true);
        expect(pioneerClient.memberPresentation).toHaveBeenCalledWith({
            auth,
            capability_snapshot: capabilitySnapshot,
            member,
            is_workspace_member: true,
        });
        await removeMember(member);
        expect(pioneerClient.memberRemove).toHaveBeenCalledWith({
            principal_id: member.principal_id,
            expected_status: 'active',
        });
    });

    it('uses the existing native activation presentation for recovery', async () => {
        const endpoint = { gateway_base_url: 'https://gateway.test/' } as never;
        const activation = { session_id: 'session-secret' } as never;
        jest.mocked(pioneerClient.memberDeviceCreate).mockResolvedValue({
            principal_id: member.principal_id,
            activation,
        });
        jest.mocked(pioneerClient.gatewayDeviceActivationPresentation).mockReturnValue({
            session_id: 'session-secret',
        } as never);
        await createRecoveryDevicePresentation(endpoint, member.principal_id);
        expect(pioneerClient.gatewayDeviceActivationPresentation).toHaveBeenCalledWith({
            gateway_base_url: 'https://gateway.test/',
            created_device: activation,
            app_url_scheme: 'pioneer-dev',
        });
    });

    it('keeps recovery secrets ephemeral and avatar bytes outside JavaScript', () => {
        const screen = readFileSync(
            join(process.cwd(), 'src/screens/settings/members.tsx'),
            'utf8',
        );
        expect(screen).toContain('onDismiss={clearRecovery}');
        expect(screen).toContain('<MemberAvatar');
        expect(screen).toContain('principalId={item.principal_id}');
        expect(screen).toContain('{rows.map(renderMember)}');
        expect(screen).toContain('<WorkspaceToggleSelector');
        expect(screen).toContain('<CredentialPresentation');
        expect(screen).not.toContain('MMKV');
        expect(screen).not.toContain('content_base64');
        expect(screen).not.toContain('console.');
        expect(screen).toContain('administrationConflictRefetch');
        expect(screen).toContain('invalidateAdministrationTargets');
    });
});

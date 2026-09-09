import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AuthMeResponse, AuthorizationCapabilitySnapshot, MemberSummary } from '@/client';
import { pioneerClient } from '@/client';
import { performAdministrationCommand, prepareAdministrationCommand } from './operations';
import { createRecoveryDevicePresentation, presentMember, removeMember } from './members';
jest.mock('./operations', () => ({
    performAdministrationCommand: jest.fn(),
    prepareAdministrationCommand: jest.fn(() => 12),
}));

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
    role: {
        key: 'member',
        display_name: 'Member',
        description: 'Workspace collaborator',
        built_in: true,
    },
    lifecycle_managed: true,
    status: 'active',
} satisfies MemberSummary;

describe('mobile member administration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
        expect(performAdministrationCommand).toHaveBeenCalledWith({
            kind: 'remove_member',
            params: {
                principal_id: member.principal_id,
                expected_status: 'active',
            },
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
        expect(prepareAdministrationCommand).toHaveBeenCalledWith({
            kind: 'create_recovery_device',
            params: { principal_id: member.principal_id },
        });
        expect(pioneerClient.memberDeviceCreate).toHaveBeenCalledWith({
            schema_version: 1,
            generation: 12,
        });
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
        expect(screen).not.toContain('useMutation');
        expect(screen).not.toContain('useInfiniteQuery');
    });
});

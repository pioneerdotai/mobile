import { describe, expect, it } from '@jest/globals';

import type { MemberSummary } from '@/client';

import { projectWorkspaceMemberProfiles, projectWorkspaceMentionCandidates } from './mentions';

const member = (
    principalId: string,
    nickname: string,
    kind: MemberSummary['kind'] = 'user',
): MemberSummary => ({
    principal_id: principalId,
    kind,
    display_name: nickname,
    nickname,
    status: 'active',
});

describe('workspace mention candidates', () => {
    it('adds implicit superusers without leaking members from other workspaces or self', () => {
        const current = member('current', 'current');
        const workspaceMember = member('workspace-member', 'workspace_member');
        const superuser = member('root', 'root', 'superuser');
        const otherWorkspaceMember = member('other-workspace', 'other_workspace');

        const candidates = projectWorkspaceMentionCandidates(
            [current, workspaceMember],
            [current, workspaceMember, superuser, otherWorkspaceMember],
            current.principal_id,
        );

        expect(candidates.map((candidate) => candidate.principal_id)).toEqual([
            workspaceMember.principal_id,
            superuser.principal_id,
        ]);
    });

    it('deduplicates superusers already present and excludes inactive profiles', () => {
        const root = member('root', 'root', 'superuser');
        const suspendedRoot = {
            ...member('suspended-root', 'suspended', 'superuser'),
            status: 'suspended' as const,
        };

        const candidates = projectWorkspaceMentionCandidates([root], [root, suspendedRoot], null);

        expect(candidates.map((candidate) => candidate.principal_id)).toEqual(['root']);
    });

    it('uses the fresh directory profile for members already scoped to the workspace', () => {
        const historical = member('workspace-member', 'historical');
        const current = {
            ...historical,
            display_name: 'Current Name',
            nickname: 'current',
            avatar_revision: 'current-avatar',
        };
        const unrelated = member('other-workspace', 'unrelated');

        const profiles = projectWorkspaceMemberProfiles([historical], [current, unrelated]);

        expect(profiles).toEqual([current]);
    });
});

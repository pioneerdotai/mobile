import type { ComposerMentionCandidate, MemberSummary } from '@/client';

/**
 * Workspace membership is explicit for ordinary Members, while Superusers
 * have implicit access. Merge only Superusers from the ACL-scoped Gateway
 * directory so Members from unrelated workspaces cannot leak into mentions.
 */
export const projectWorkspaceMentionCandidates = (
    workspaceMembers: readonly MemberSummary[],
    memberDirectory: readonly MemberSummary[],
    currentPrincipalId: string | null | undefined,
): ComposerMentionCandidate[] => {
    const seen = new Set<string>();
    const candidates: ComposerMentionCandidate[] = [];
    const effectiveMembers = projectWorkspaceMemberProfiles(workspaceMembers, memberDirectory);

    for (const member of effectiveMembers) {
        const nickname = member.nickname.trim();
        if (
            member.status !== 'active' ||
            !nickname ||
            member.principal_id === currentPrincipalId ||
            seen.has(member.principal_id)
        ) {
            continue;
        }
        seen.add(member.principal_id);
        candidates.push({
            principal_id: member.principal_id,
            display_name: member.display_name,
            nickname,
            avatar_revision: member.avatar_revision ?? null,
        });
    }

    return candidates;
};

/** Current profiles visible in a workspace. Ordinary users require explicit
 * membership; Superusers have implicit access and come from the ACL directory. */
export const projectWorkspaceMemberProfiles = (
    workspaceMembers: readonly MemberSummary[],
    memberDirectory: readonly MemberSummary[],
): MemberSummary[] => {
    const seen = new Set<string>();
    const profiles: MemberSummary[] = [];
    const currentByPrincipalId = new Map(
        memberDirectory.map((member) => [member.principal_id, member] as const),
    );

    for (const member of [
        ...workspaceMembers.map(
            (workspaceMember) =>
                currentByPrincipalId.get(workspaceMember.principal_id) ?? workspaceMember,
        ),
        ...memberDirectory.filter((candidate) => candidate.kind === 'superuser'),
    ]) {
        if (seen.has(member.principal_id)) continue;
        seen.add(member.principal_id);
        profiles.push(member);
    }

    return profiles;
};

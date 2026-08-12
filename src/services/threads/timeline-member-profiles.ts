import type { MemberSummary } from '@/client';
import { ensureTimelineRowRenderFingerprint } from '@/services/threads/conversation/render-fingerprint';
import type { TimelineRow } from '@/services/threads/conversation/timeline';

/**
 * Persisted author snapshots remain a reliable fallback, but chat identity is
 * presented from the current member directory. This updates every message by
 * the same stable principal together after a profile change.
 */
export const applyCurrentMemberProfilesToTimelineRows = (
    rows: readonly TimelineRow[],
    members: readonly MemberSummary[],
): TimelineRow[] => {
    if (rows.length === 0 || members.length === 0) return [...rows];

    const memberByPrincipalId = new Map(
        members.map((member) => [member.principal_id, member] as const),
    );

    return rows.map((row) => {
        if (row.type !== 'user-message' || row.author?.actor.kind !== 'principal') return row;

        const member = memberByPrincipalId.get(row.author.actor.id);
        if (!member) return row;

        const avatarRevision = member.avatar_revision ?? null;
        if (
            row.author.display_name === member.display_name &&
            row.author.nickname === member.nickname &&
            (row.author.avatar_revision ?? null) === avatarRevision
        ) {
            return row;
        }

        return ensureTimelineRowRenderFingerprint({
            ...row,
            author: {
                ...row.author,
                display_name: member.display_name,
                nickname: member.nickname,
                avatar_revision: avatarRevision,
            },
            renderFingerprint: undefined,
        });
    });
};

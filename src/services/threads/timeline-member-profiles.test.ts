import { describe, expect, it } from '@jest/globals';

import type { MemberSummary } from '@/client';
import type { TimelineRow } from '@/services/threads/conversation/timeline';

import { applyCurrentMemberProfilesToTimelineRows } from './timeline-member-profiles';

const member = (principalId: string): MemberSummary => ({
    principal_id: principalId,
    kind: 'user',
    display_name: 'Current Name',
    nickname: 'current',
    role_key: 'member',
    status: 'active',
    avatar_revision: 'current-avatar',
});

const message = (key: string, principalId: string, displayName: string): TimelineRow =>
    ({
        type: 'user-message',
        key,
        itemId: key,
        turnId: key,
        text: key,
        attachments: [],
        timestampLabel: '',
        mode: 'Message',
        author: {
            actor: { kind: 'principal', id: principalId },
            display_name: displayName,
            nickname: displayName.toLowerCase(),
            avatar_revision: `${key}-avatar`,
        },
        reply: null,
        replyState: null,
        mentions: [],
        revision: 0,
        edited: false,
        deleted: false,
        renderFingerprint: `persisted-${key}`,
    }) as TimelineRow;

describe('applyCurrentMemberProfilesToTimelineRows', () => {
    it('presents every historical message using the current profile of its principal', () => {
        const rows = [
            message('first', 'principal-a', 'First Name'),
            message('second', 'principal-a', 'Second Name'),
        ];

        const result = applyCurrentMemberProfilesToTimelineRows(rows, [member('principal-a')]);

        expect(result.map((row) => (row.type === 'user-message' ? row.author : null))).toEqual([
            {
                actor: { kind: 'principal', id: 'principal-a' },
                display_name: 'Current Name',
                nickname: 'current',
                avatar_revision: 'current-avatar',
            },
            {
                actor: { kind: 'principal', id: 'principal-a' },
                display_name: 'Current Name',
                nickname: 'current',
                avatar_revision: 'current-avatar',
            },
        ]);
        expect(result[0].renderFingerprint).not.toBe(rows[0].renderFingerprint);
    });

    it('keeps the persisted snapshot when no current profile is visible', () => {
        const row = message('first', 'principal-a', 'Historical Name');

        const [result] = applyCurrentMemberProfilesToTimelineRows([row], [member('principal-b')]);

        expect(result).toBe(row);
    });
});

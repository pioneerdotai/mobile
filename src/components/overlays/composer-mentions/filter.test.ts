import { describe, expect, it } from '@jest/globals';

import type { ComposerMentionCandidate } from '@/client';
import { filterComposerMentionCandidates } from './filter';

const candidates: ComposerMentionCandidate[] = [
    {
        principal_id: 'alice',
        display_name: 'Белая Элис',
        nickname: 'mention-alice',
        avatar_revision: null,
    },
    {
        principal_id: 'bob',
        display_name: 'Mention Test Bob',
        nickname: 'mention-bob',
        avatar_revision: null,
    },
    {
        principal_id: 'charlie',
        display_name: 'Mention Test Charlie',
        nickname: 'mention-charlie',
        avatar_revision: null,
    },
];

describe('filterComposerMentionCandidates', () => {
    it('filters by display name without case sensitivity', () => {
        expect(filterComposerMentionCandidates(candidates, 'элис')).toEqual([candidates[0]]);
    });

    it('filters by nickname with an optional @ prefix', () => {
        expect(filterComposerMentionCandidates(candidates, '@MENTION-BOB')).toEqual([
            candidates[1],
        ]);
    });

    it('returns every candidate for a blank query', () => {
        expect(filterComposerMentionCandidates(candidates, '   ')).toEqual(candidates);
    });
});

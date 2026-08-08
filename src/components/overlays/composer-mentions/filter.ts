import type { ComposerMentionCandidate } from '@/client';

export const filterComposerMentionCandidates = (
    candidates: readonly ComposerMentionCandidate[],
    query: string,
): ComposerMentionCandidate[] => {
    const normalizedQuery = query.trim().replace(/^@/u, '').toLocaleLowerCase();
    if (!normalizedQuery) {
        return [...candidates];
    }

    return candidates.filter(
        (candidate) =>
            candidate.display_name.toLocaleLowerCase().includes(normalizedQuery) ||
            candidate.nickname.toLocaleLowerCase().includes(normalizedQuery),
    );
};

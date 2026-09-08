import type { ComposerDomainState } from '@/client/generated/composer_domain_state';

export const selectedReasoningEffortRequestFields = (
    effort: string | null | undefined,
): Pick<ComposerDomainState, 'selected_reasoning_effort'> => {
    const selectedReasoningEffort = effort?.trim() || null;

    return selectedReasoningEffort ? { selected_reasoning_effort: selectedReasoningEffort } : {};
};

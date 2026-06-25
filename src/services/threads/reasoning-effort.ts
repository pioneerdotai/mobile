import type { ClientActiveThreadSendTextRequest } from '@/client';

export const selectedReasoningEffortRequestFields = (
    effort: string | null | undefined,
): Pick<ClientActiveThreadSendTextRequest, 'selected_reasoning_effort'> => {
    const selectedReasoningEffort = effort?.trim() || null;

    return selectedReasoningEffort ? { selected_reasoning_effort: selectedReasoningEffort } : {};
};

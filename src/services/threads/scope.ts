import type { QueryClient } from '@tanstack/react-query';
import type { Thread } from '@/client';

export const threadScopeQueryKeys = {
    all: ['thread-scope'] as const,
    detail: (threadId: string) => [...threadScopeQueryKeys.all, { threadId }] as const,
};

export const nextThreadVisibility = (
    visibility: Thread['visibility'],
): 'private' | 'workspace' | null => {
    if (visibility === 'private') return 'workspace';
    if (visibility === 'workspace') return 'private';
    return null;
};

export const clearThreadScopeQueries = (
    queryClient: QueryClient,
    threadIds?: readonly string[],
) => {
    if (!threadIds?.length) {
        void queryClient.cancelQueries({ queryKey: threadScopeQueryKeys.all });
        queryClient.removeQueries({ queryKey: threadScopeQueryKeys.all });
        return;
    }
    for (const threadId of threadIds) {
        const queryKey = threadScopeQueryKeys.detail(threadId);
        void queryClient.cancelQueries({ queryKey });
        queryClient.removeQueries({ queryKey });
    }
};

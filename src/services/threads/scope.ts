import type { QueryClient } from '@tanstack/react-query';

import {
    pioneerClient,
    type AuthMeResponse,
    type Thread,
    type ThreadParticipantsResponse,
    type ThreadScopeMutationPlan,
    type ThreadScopePresentation,
    type WorkspaceMemberListResponse,
} from '@/client';
import { loadAllWorkspaceMembers } from '@/services/administration/members';
import { administrationQueryKeys } from '@/services/administration/query';
import { timelineQueryKeys } from '@/services/threads/timeline-query';

export const threadScopeQueryKeys = {
    all: ['thread-scope'] as const,
    detail: (threadId: string) => [...threadScopeQueryKeys.all, { threadId }] as const,
};

export const threadScopeMutationKey = ['thread-scope', 'mutation'] as const;
export type ThreadScopeAction = ThreadScopeMutationPlan['action'];

export const nextThreadVisibility = (
    visibility: Thread['visibility'],
): 'private' | 'workspace' | null => {
    if (visibility === 'private') return 'workspace';
    if (visibility === 'workspace') return 'private';
    return null;
};

export const planThreadScopeMutation = (
    workspaceId: string,
    threadId: string,
    action: ThreadScopeAction,
): ThreadScopeMutationPlan =>
    pioneerClient.threadScopeMutationPlan({
        workspace_id: workspaceId,
        thread_id: threadId,
        action,
    });

export const loadThreadScopePresentation = async (
    auth: AuthMeResponse,
    thread: Thread,
): Promise<ThreadScopePresentation> => {
    let participants: ThreadParticipantsResponse = {
        workspace_id: thread.workspace_id,
        thread_id: thread.id,
        participant_ids: [],
        participants: [],
        changed: false,
    };
    let currentPrincipalIsCreator = false;
    if (thread.visibility === 'private') {
        try {
            participants = await pioneerClient.threadParticipantsList({
                workspace_id: thread.workspace_id,
                thread_id: thread.id,
            });
            // The current Gateway admits this management RPC only for the creator
            // or a Superuser. Success is therefore an authoritative capability
            // fact; the client does not infer ownership from timeline content.
            currentPrincipalIsCreator = auth.principal.kind === 'user';
        } catch {
            // A non-creator may still render the already-authorized thread's
            // visibility. Participant identities and management remain hidden.
            participants = {
                workspace_id: thread.workspace_id,
                thread_id: thread.id,
                participant_ids: [],
                participants: [],
                changed: false,
            };
        }
    }
    const workspaceMembers: WorkspaceMemberListResponse = await loadAllWorkspaceMembers(
        thread.workspace_id,
    );
    return pioneerClient.threadScopePresentation({
        auth,
        thread,
        current_principal_is_creator: currentPrincipalIsCreator,
        participants,
        workspace_members: workspaceMembers,
    });
};

export const addThreadParticipant = (workspaceId: string, threadId: string, principalId: string) =>
    pioneerClient.threadParticipantAdd({
        workspace_id: workspaceId,
        thread_id: threadId,
        principal_id: principalId,
    });

export const removeThreadParticipant = (
    workspaceId: string,
    threadId: string,
    principalId: string,
) =>
    pioneerClient.threadParticipantRemove({
        workspace_id: workspaceId,
        thread_id: threadId,
        principal_id: principalId,
    });

export const updateThreadVisibility = (
    workspaceId: string,
    threadId: string,
    visibility: 'private' | 'workspace',
) =>
    pioneerClient.threadUpdate({
        workspace_id: workspaceId,
        thread_id: threadId,
        visibility,
    });

export const executeThreadScopeMutation = (plan: ThreadScopeMutationPlan) => {
    switch (plan.action.kind) {
        case 'add_participant':
            return addThreadParticipant(
                plan.workspace_id,
                plan.thread_id,
                plan.action.principal_id,
            );
        case 'remove_participant':
            return removeThreadParticipant(
                plan.workspace_id,
                plan.thread_id,
                plan.action.principal_id,
            );
        case 'update_visibility':
            return updateThreadVisibility(
                plan.workspace_id,
                plan.thread_id,
                plan.action.visibility,
            );
        case 'list_participants':
            return pioneerClient.threadParticipantsList({
                workspace_id: plan.workspace_id,
                thread_id: plan.thread_id,
            });
    }
};

export const invalidateThreadScope = async (
    queryClient: QueryClient,
    plan: ThreadScopeMutationPlan,
) => {
    await Promise.all(
        plan.refetch.map((target) => {
            switch (target) {
                case 'participants':
                    return queryClient.invalidateQueries({
                        queryKey: threadScopeQueryKeys.detail(plan.thread_id),
                    });
                case 'thread':
                    return queryClient.invalidateQueries({
                        queryKey: timelineQueryKeys.threadSnapshot(plan.thread_id),
                    });
                case 'workspace_members':
                    return queryClient.invalidateQueries({
                        queryKey: administrationQueryKeys.workspaceMembers(plan.workspace_id),
                    });
            }
        }),
    );
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

import type { QueryClient } from '@tanstack/react-query';

import {
    pioneerClient,
    type AuthMeResponse,
    type AuthorizationThreadCapabilities,
    type Thread,
    type ThreadParticipantsResponse,
    type ThreadScopeMutationPlan,
    type ThreadScopePresentation,
    type WorkspaceMemberListResponse,
} from '@/client';
import { loadAllWorkspaceMembers } from '@/services/administration/members';
import {
    acceptAuthorizationCapabilitySnapshot,
    administrationQueryKeys,
    type AdministrationAuthorizationEpoch,
} from '@/services/administration/query';
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
    authorizationEpoch: AdministrationAuthorizationEpoch,
): Promise<ThreadScopePresentation> => {
    const emptyCapabilities: AuthorizationThreadCapabilities = {
        can_bind_artifacts: false,
        can_cancel_agent_execution: false,
        can_cancel_tasks: false,
        can_control_cli_runtime: false,
        can_create_task: false,
        can_delete_own_message: false,
        can_edit_own_message: false,
        can_manage: false,
        can_manage_agents_document: false,
        can_manage_private_participants: false,
        can_move: false,
        can_observe_agent_execution: false,
        can_observe_agent_requests: false,
        can_read: false,
        can_read_agents_document: false,
        can_read_artifacts: false,
        can_respond_to_agent_requests: false,
        can_resume_agent_execution: false,
        can_review_tasks: false,
        can_start_turn: false,
        can_steer_agent_execution: false,
        can_write: false,
        can_write_artifacts: false,
    };
    let participants: ThreadParticipantsResponse = {
        workspace_id: thread.workspace_id,
        thread_id: thread.id,
        participant_ids: [],
        participants: [],
        changed: false,
    };
    let capabilities = emptyCapabilities;
    try {
        const [participantsResponse, rawCapabilitySnapshot] = await Promise.all([
            pioneerClient.threadParticipantsList({
                workspace_id: thread.workspace_id,
                thread_id: thread.id,
            }),
            pioneerClient.gatewayAuthorizationCapabilities({
                workspace_id: thread.workspace_id,
                thread_id: thread.id,
            }),
        ]);
        const capabilitySnapshot = acceptAuthorizationCapabilitySnapshot(
            authorizationEpoch,
            auth.principal.id,
            thread.workspace_id,
            thread.id,
            rawCapabilitySnapshot,
        );
        participants = participantsResponse;
        capabilities = capabilitySnapshot.thread?.capabilities ?? emptyCapabilities;
    } catch {
        // Missing or future capability data fails closed. The authorized
        // thread itself remains readable, but no management action is shown.
    }
    const workspaceMembers: WorkspaceMemberListResponse = await loadAllWorkspaceMembers(
        thread.workspace_id,
    );
    return pioneerClient.threadScopePresentation({
        auth,
        thread,
        capabilities,
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

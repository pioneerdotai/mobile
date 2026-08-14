import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';

import { pioneerClient, type AuthMeResponse, type Thread } from '@/client';
import { loadAllWorkspaceMembers } from '@/services/administration/members';
import {
    addThreadParticipant,
    executeThreadScopeMutation,
    invalidateThreadScope,
    loadThreadScopePresentation,
    nextThreadVisibility,
    planThreadScopeMutation,
    removeThreadParticipant,
    updateThreadVisibility,
} from '@/services/threads/scope';

jest.mock('@/client', () => ({
    pioneerClient: {
        threadParticipantsList: jest.fn(),
        threadParticipantAdd: jest.fn(),
        threadParticipantRemove: jest.fn(),
        threadUpdate: jest.fn(),
        gatewayAuthorizationCapabilities: jest.fn(),
        threadScopePresentation: jest.fn(),
        threadScopeMutationPlan: jest.fn(),
    },
}));
jest.mock('@/services/administration/members', () => ({
    loadAllWorkspaceMembers: jest.fn(),
}));

const auth = {
    principal: { id: 'PAAAAAAAAAAAAAAAAAAAA', kind: 'user' },
} as unknown as AuthMeResponse;
const privateThread = {
    workspace_id: 'WAAAAAAAAAAAAAAAAAAAA',
    id: 'thread',
    visibility: 'private',
} as unknown as Thread;

describe('thread scope service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('toggles only user-selectable thread visibility values', () => {
        expect(nextThreadVisibility('private')).toBe('workspace');
        expect(nextThreadVisibility('workspace')).toBe('private');
        expect(nextThreadVisibility(null)).toBeNull();
        expect(nextThreadVisibility(undefined)).toBeNull();
    });

    it('projects only authoritative participant and workspace snapshots', async () => {
        const capabilities = {
            can_bind_artifacts: true,
            can_cancel_agent_execution: true,
            can_cancel_tasks: true,
            can_control_cli_runtime: true,
            can_create_task: true,
            can_delete_own_message: true,
            can_edit_own_message: true,
            can_manage: true,
            can_manage_agents_document: true,
            can_manage_private_participants: true,
            can_move: false,
            can_observe_agent_execution: true,
            can_observe_agent_requests: true,
            can_read: true,
            can_read_agents_document: true,
            can_read_artifacts: true,
            can_respond_to_agent_requests: true,
            can_resume_agent_execution: true,
            can_review_tasks: true,
            can_start_turn: true,
            can_steer_agent_execution: true,
            can_write: true,
            can_write_artifacts: true,
        };
        const participants = {
            workspace_id: 'WAAAAAAAAAAAAAAAAAAAA',
            thread_id: 'thread',
            participant_ids: ['PAAAAAAAAAAAAAAAAAAAA'],
            participants: [],
            changed: false,
        };
        const members = {
            workspace_id: 'WAAAAAAAAAAAAAAAAAAAA',
            members: [],
            next_cursor: null,
        };
        jest.mocked(pioneerClient.threadParticipantsList).mockResolvedValue(participants);
        jest.mocked(pioneerClient.gatewayAuthorizationCapabilities).mockResolvedValue({
            schema_version: 1,
            authorization_revision: 1,
            principal_id: auth.principal.id,
            role_key: 'member',
            role: {
                key: 'member',
                display_name: 'Member',
                description: 'Workspace collaborator',
                built_in: true,
            },
            global: {} as never,
            thread: {
                workspace_id: privateThread.workspace_id,
                thread_id: privateThread.id,
                capabilities,
            },
        });
        jest.mocked(loadAllWorkspaceMembers).mockResolvedValue(members);
        jest.mocked(pioneerClient.threadScopePresentation).mockReturnValue({
            marker: true,
        } as never);

        await expect(loadThreadScopePresentation(auth, privateThread)).resolves.toEqual({
            marker: true,
        });
        expect(pioneerClient.threadScopePresentation).toHaveBeenCalledWith({
            auth,
            thread: privateThread,
            capabilities,
            participants,
            workspace_members: members,
        });
    });

    it('renders authorized private scope fail-closed when participant management is forbidden', async () => {
        const members = {
            workspace_id: 'WAAAAAAAAAAAAAAAAAAAA',
            members: [],
            next_cursor: null,
        };
        jest.mocked(pioneerClient.threadParticipantsList).mockRejectedValue(new Error('forbidden'));
        jest.mocked(loadAllWorkspaceMembers).mockResolvedValue(members);
        jest.mocked(pioneerClient.threadScopePresentation).mockReturnValue({} as never);

        await loadThreadScopePresentation(auth, privateThread);

        expect(pioneerClient.threadScopePresentation).toHaveBeenCalledWith({
            auth,
            thread: privateThread,
            capabilities: {
                can_bind_artifacts: false,
                can_cancel_agent_execution: false,
                can_read: false,
                can_write: false,
                can_edit_own_message: false,
                can_delete_own_message: false,
                can_start_turn: false,
                can_observe_agent_execution: false,
                can_steer_agent_execution: false,
                can_resume_agent_execution: false,
                can_respond_to_agent_requests: false,
                can_observe_agent_requests: false,
                can_control_cli_runtime: false,
                can_create_task: false,
                can_review_tasks: false,
                can_cancel_tasks: false,
                can_read_agents_document: false,
                can_manage_agents_document: false,
                can_read_artifacts: false,
                can_write_artifacts: false,
                can_manage: false,
                can_manage_private_participants: false,
                can_move: false,
            },
            participants: {
                workspace_id: privateThread.workspace_id,
                thread_id: privateThread.id,
                participant_ids: [],
                participants: [],
                changed: false,
            },
            workspace_members: members,
        });
    });

    it('mutations reuse existing RPC without a local ACL', async () => {
        await addThreadParticipant('workspace', 'thread', 'principal');
        await removeThreadParticipant('workspace', 'thread', 'principal');
        await updateThreadVisibility('workspace', 'thread', 'private');
        expect(pioneerClient.threadParticipantAdd).toHaveBeenCalledTimes(1);
        expect(pioneerClient.threadParticipantRemove).toHaveBeenCalledTimes(1);
        expect(pioneerClient.threadUpdate).toHaveBeenCalledWith({
            workspace_id: 'workspace',
            thread_id: 'thread',
            visibility: 'private',
        });
    });

    it('delegates mutation and exact refetch planning to shared Rust', async () => {
        const plan = {
            workspace_id: 'workspace',
            thread_id: 'thread',
            action: { kind: 'update_visibility', visibility: 'workspace' },
            refetch: ['thread', 'participants'],
        } as const;
        jest.mocked(pioneerClient.threadScopeMutationPlan).mockReturnValue(plan as never);

        expect(
            planThreadScopeMutation('workspace', 'thread', {
                kind: 'update_visibility',
                visibility: 'workspace',
            }),
        ).toEqual(plan);
        expect(pioneerClient.threadScopeMutationPlan).toHaveBeenCalledWith({
            workspace_id: 'workspace',
            thread_id: 'thread',
            action: { kind: 'update_visibility', visibility: 'workspace' },
        });

        await executeThreadScopeMutation(plan as never);
        expect(pioneerClient.threadUpdate).toHaveBeenCalledWith({
            workspace_id: 'workspace',
            thread_id: 'thread',
            visibility: 'workspace',
        });

        const queryClient = new QueryClient();
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
        await invalidateThreadScope(queryClient, plan as never);
        expect(invalidate).toHaveBeenCalledTimes(2);
        expect(invalidate.mock.calls.map(([input]) => input?.queryKey?.[0])).toEqual([
            'timeline',
            'thread-scope',
        ]);
        queryClient.clear();
    });
});

import type { AuthorizationThreadCapabilities, AuthorizationWorkspaceCapabilities } from '@/client';

type AgentCapabilityProjection = Readonly<{
    isDraftThread: boolean;
    workspace: AuthorizationWorkspaceCapabilities | null | undefined;
    thread: AuthorizationThreadCapabilities | null | undefined;
}>;

/**
 * Maps server-owned atomic agent actions to the Mobile controls that consume
 * them. This is deliberately role-agnostic: a future role changes only the
 * Gateway projection, never this mapping.
 */
export const projectAgentActionCapabilities = ({
    isDraftThread,
    workspace,
    thread,
}: AgentCapabilityProjection) => ({
    canStart: Boolean(
        workspace &&
        (workspace.can_use_providers || workspace.can_use_cli_runtimes) &&
        (isDraftThread ? workspace.can_create_thread : thread?.can_start_turn),
    ),
    canCancel: Boolean(!isDraftThread && thread?.can_cancel_agent_execution),
    canSteer: Boolean(!isDraftThread && thread?.can_steer_agent_execution),
});

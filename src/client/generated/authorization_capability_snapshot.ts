/* eslint-disable */

export type PrincipalId = string;
/**
 * User-selectable visibility for ordinary user threads.
 *
 * Internal task/system threads deliberately have no public selectable value.
 */
export type ThreadVisibility = 'private' | 'workspace';
export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';

export interface AuthorizationCapabilitySnapshot {
  authorization_revision: number;
  global: AuthorizationGlobalCapabilities;
  principal_id: PrincipalId;
  /**
   * Stable built-in role identifier. Clients may display this value but
   * must never derive permissions from it.
   */
  role_key: string;
  schema_version: number;
  thread?: AuthorizationThreadCapabilitySnapshot | null;
  workspace?: AuthorizationWorkspaceCapabilitySnapshot | null;
}
export interface AuthorizationGlobalCapabilities {
  can_create_invitation: boolean;
  can_create_workspace: boolean;
  can_manage_all_threads: boolean;
  can_manage_capabilities: boolean;
  can_manage_gateway_settings: boolean;
  can_manage_member_lifecycle: boolean;
  can_manage_own_sessions: boolean;
  can_view_invitations: boolean;
  can_view_member_directory: boolean;
}
export interface AuthorizationThreadCapabilitySnapshot {
  capabilities: AuthorizationThreadCapabilities;
  thread_id: string;
  workspace_id: string;
}
export interface AuthorizationThreadCapabilities {
  can_control_cli_runtime: boolean;
  can_create_task: boolean;
  can_manage: boolean;
  can_manage_private_participants: boolean;
  can_move: boolean;
  can_read: boolean;
  can_read_artifacts: boolean;
  can_respond_to_agent_requests: boolean;
  can_start_turn: boolean;
  can_write: boolean;
  can_write_artifacts: boolean;
}
export interface AuthorizationWorkspaceCapabilitySnapshot {
  capabilities: AuthorizationWorkspaceCapabilities;
  workspace_id: string;
}
export interface AuthorizationWorkspaceCapabilities {
  can_add_member: boolean;
  can_create_thread: boolean;
  can_list_members: boolean;
  can_manage: boolean;
  can_read: boolean;
  can_remove_member: boolean;
  can_run_tasks: boolean;
  can_use_cli_runtimes: boolean;
  can_use_mcp: boolean;
  can_use_providers: boolean;
  can_use_skills: boolean;
  thread_visibility_options: ThreadVisibility[];
  /**
   * Permission modes this principal may select for an agent turn in this
   * workspace. The Gateway applies the same role cap again at execution.
   */
  turn_permission_modes: TurnPermissionMode[];
}

/* eslint-disable */

/**
 * User-selectable visibility for ordinary user threads.
 *
 * Internal task/system threads deliberately have no public selectable value.
 */
export type ThreadVisibility = 'private' | 'workspace';
export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';
export type ThreadOriginKind = ('task_run' | 'system') | 'collaborative' | 'direct_message' | 'user';

export interface ClientThreadCreateVisibilityRequest {
  capabilities: AuthorizationWorkspaceCapabilities;
  origin_kind: ThreadOriginKind;
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

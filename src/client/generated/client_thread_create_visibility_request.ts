/* eslint-disable */

export type PermissionBehavior = 'allow' | 'ask' | 'deny';
export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';
/**
 * User-selectable visibility for ordinary user threads.
 *
 * Internal task/system threads deliberately have no public selectable value.
 */
export type ThreadVisibility = 'private' | 'workspace';
export type ThreadOriginKind = ('task_run' | 'system') | 'collaborative' | 'direct_message' | 'user';

export interface ClientThreadCreateVisibilityRequest {
  capabilities: AuthorizationWorkspaceCapabilities;
  origin_kind: ThreadOriginKind;
}
export interface AuthorizationWorkspaceCapabilities {
  /**
   * Server-compiled UX presets after intersection with the immutable role
   * ceiling. Clients render these policies and locked fields verbatim.
   */
  agent_permission_options: AuthorizationAgentPermissionOption[];
  /**
   * Acknowledge rows from the authenticated principal's durable Task
   * notification inbox in this workspace.
   */
  can_acknowledge_own_notifications: boolean;
  can_add_member: boolean;
  can_create_thread: boolean;
  can_list_members: boolean;
  can_manage: boolean;
  can_read: boolean;
  can_read_artifacts: boolean;
  /**
   * Read the authenticated principal's durable Task notification inbox in
   * this workspace. The Gateway still filters every row by recipient.
   */
  can_read_own_notifications: boolean;
  can_remove_member: boolean;
  can_run_tasks: boolean;
  can_use_cli_runtimes: boolean;
  can_use_mcp: boolean;
  can_use_providers: boolean;
  can_use_skills: boolean;
  can_write_artifacts: boolean;
  execution_limits: AuthorizationExecutionResourceLimits;
  thread_visibility_options: ThreadVisibility[];
}
export interface AuthorizationAgentPermissionOption {
  description: string;
  effective_policy: ToolPermissionPolicySnapshot;
  id: string;
  label: string;
  locked?: AuthorizationPermissionLock[];
  mode: TurnPermissionMode;
}
export interface ToolPermissionPolicySnapshot {
  allowed_paths?: string[];
  allowed_tools?: string[];
  computer_use: PermissionBehavior;
  default_behavior: PermissionBehavior;
  denied_tools?: string[];
  dynamic_skill_tool: PermissionBehavior;
  file_read: PermissionBehavior;
  file_write: PermissionBehavior;
  mcp_read: PermissionBehavior;
  mcp_write_or_unknown: PermissionBehavior;
  network: PermissionBehavior;
  shell_command: PermissionBehavior;
  task_subagent: PermissionBehavior;
  [k: string]: unknown;
}
export interface AuthorizationPermissionLock {
  field: string;
  reason: string;
}
/**
 * Server-enforced aggregate execution limits for this principal. These
 * are presentation only; every durable start reserves a Gateway lease.
 */
export interface AuthorizationExecutionResourceLimits {
  max_active_executions: number;
  max_queued_tasks: number;
  max_scheduled_tasks: number;
}

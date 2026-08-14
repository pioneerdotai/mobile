/* eslint-disable */

export type ClientKind = 'desktop' | 'mobile' | 'other';
export type DeviceId = string;
export type DeviceStatus = 'pending' | 'active' | 'revoked';
export type GatewayId = string;
export type PrincipalId = string;
export type PrincipalKind = 'superuser' | 'user';
export type RoleKey = string;
export type AuthSessionId = string;
export type AuthSessionStatus = 'pending' | 'active' | 'revoked' | 'expired';
export type TokenFamilyId = string;
export type PermissionBehavior = 'allow' | 'ask' | 'deny';
export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';
/**
 * User-selectable visibility for ordinary user threads.
 *
 * Internal task/system threads deliberately have no public selectable value.
 */
export type ThreadVisibility = 'private' | 'workspace';
export type PrincipalStatus = 'active' | 'suspended' | 'removed';

export interface ClientMemberPresentationRequest {
  auth: AuthMeResponse;
  capability_snapshot: AuthorizationCapabilitySnapshot;
  is_workspace_member: boolean;
  member: MemberSummary;
}
export interface AuthMeResponse {
  device: AuthDeviceSnapshot;
  gateway: AuthGatewaySnapshot;
  principal: AuthPrincipalSnapshot;
  role_key?: RoleKey | null;
  session: AuthSessionSnapshot;
  [k: string]: unknown;
}
export interface AuthDeviceSnapshot {
  client_kind: ClientKind;
  display_name: string;
  id: DeviceId;
  installation_id: string;
  status: DeviceStatus;
  [k: string]: unknown;
}
export interface AuthGatewaySnapshot {
  id: GatewayId;
  [k: string]: unknown;
}
export interface AuthPrincipalSnapshot {
  avatar_revision?: string | null;
  display_name: string;
  id: PrincipalId;
  kind: PrincipalKind;
  nickname: string;
  [k: string]: unknown;
}
export interface AuthSessionSnapshot {
  device_id: DeviceId;
  id: AuthSessionId;
  refresh_expires_at_unix: number;
  refresh_generation: number;
  status: AuthSessionStatus;
  token_family_id: TokenFamilyId;
  [k: string]: unknown;
}
export interface AuthorizationCapabilitySnapshot {
  authorization_revision: number;
  global: AuthorizationGlobalCapabilities;
  principal_id: PrincipalId;
  role: AuthorizationRolePresentation;
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
  can_manage_cli_runtimes: boolean;
  can_manage_gateway_settings: boolean;
  can_manage_mcp: boolean;
  can_manage_member_lifecycle: boolean;
  can_manage_own_sessions: boolean;
  can_manage_providers: boolean;
  can_manage_skills: boolean;
  can_view_invitations: boolean;
  can_view_member_directory: boolean;
  /**
   * Roles this principal may assign through a new invitation. The Gateway
   * owns both availability and presentation; clients never manufacture a
   * role key from a local enum or principal kind.
   */
  invitation_role_options?: AuthorizationInvitationRoleOption[];
}
export interface AuthorizationInvitationRoleOption {
  is_default: boolean;
  role: AuthorizationRolePresentation;
}
/**
 * Server-owned presentation metadata for the authenticated role. The key is
 * deliberately open-ended: clients display this object but never derive
 * authorization decisions from it.
 */
export interface AuthorizationRolePresentation {
  built_in: boolean;
  description: string;
  display_name: string;
  key: string;
}
export interface AuthorizationThreadCapabilitySnapshot {
  capabilities: AuthorizationThreadCapabilities;
  thread_id: string;
  workspace_id: string;
}
export interface AuthorizationThreadCapabilities {
  can_bind_artifacts: boolean;
  can_cancel_agent_execution: boolean;
  can_cancel_tasks: boolean;
  can_control_cli_runtime: boolean;
  can_create_task: boolean;
  can_delete_own_message: boolean;
  can_edit_own_message: boolean;
  can_manage: boolean;
  can_manage_agents_document: boolean;
  can_manage_private_participants: boolean;
  can_move: boolean;
  can_observe_agent_execution: boolean;
  can_observe_agent_requests: boolean;
  can_read: boolean;
  can_read_agents_document: boolean;
  can_read_artifacts: boolean;
  can_respond_to_agent_requests: boolean;
  can_resume_agent_execution: boolean;
  can_review_tasks: boolean;
  can_start_turn: boolean;
  can_steer_agent_execution: boolean;
  can_write: boolean;
  can_write_artifacts: boolean;
}
export interface AuthorizationWorkspaceCapabilitySnapshot {
  capabilities: AuthorizationWorkspaceCapabilities;
  execution_draft_policy: AuthorizationExecutionDraftPolicyProjection;
  operational_resources: AuthorizationOperationalResourceProjection;
  workspace_id: string;
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
export interface AuthorizationExecutionDraftPolicyProjection {
  can_attach_artifacts: boolean;
  fingerprint: string;
  mcp_invocation_limits: McpInvocationResourceLimits;
  permission_options: AuthorizationAgentPermissionOption[];
  resources: AuthorizationOperationalResourceProjection;
}
/**
 * Server-owned MCP invocation envelope. Clients may present these limits,
 * while the Gateway enforces the same immutable values for every backend.
 */
export interface McpInvocationResourceLimits {
  max_arguments_bytes: number;
  max_arguments_depth: number;
  max_concurrent_calls: number;
  max_queued_calls: number;
  max_result_decoded_bytes: number;
  max_result_depth: number;
  max_result_media: number;
  max_result_tokens: number;
  max_result_wire_bytes: number;
  max_timeout_ms: number;
  profile_version: number;
}
export interface AuthorizationOperationalResourceProjection {
  cli_models?: AuthorizationCliModelGrant[];
  /**
   * Same contract as `provider_models_all`, scoped to allowed CLI runtimes.
   */
  cli_models_all: boolean;
  cli_runtimes: AuthorizationResourceSelector;
  /**
   * Opaque receipt over role policy, workspace and authorization revision.
   */
  fingerprint: string;
  mcp_servers: AuthorizationResourceSelector;
  provider_models?: AuthorizationProviderModelGrant[];
  /**
   * `true` means every model of an allowed provider; `false` means the
   * exact grants below. The flag preserves the distinction between an
   * unrestricted model set and an intentionally empty one.
   */
  provider_models_all: boolean;
  providers: AuthorizationResourceSelector;
  skills: AuthorizationResourceSelector;
}
export interface AuthorizationCliModelGrant {
  model: string;
  runtime_id: string;
}
/**
 * Role-scoped constraints used by discovery and exact admission. `all=true`
 * means every operationally enabled resource of that kind; otherwise only
 * the listed stable identifiers are visible and usable.
 */
export interface AuthorizationResourceSelector {
  all: boolean;
  ids?: string[];
}
export interface AuthorizationProviderModelGrant {
  model: string;
  provider: string;
}
export interface MemberSummary {
  avatar_revision?: string | null;
  display_name: string;
  kind: PrincipalKind;
  /**
   * Server-owned target trait. Clients may combine it with caller
   * capabilities for presentation, but never infer it from identity kind
   * or a well-known role key.
   */
  lifecycle_managed: boolean;
  nickname: string;
  principal_id: PrincipalId;
  role: AuthorizationRolePresentation1;
  role_key?: RoleKey | null;
  status: PrincipalStatus;
  [k: string]: unknown;
}
/**
 * Server-owned presentation metadata for the authenticated role. The key is
 * deliberately open-ended: clients display this object but never derive
 * authorization decisions from it.
 */
export interface AuthorizationRolePresentation1 {
  built_in: boolean;
  description: string;
  display_name: string;
  key: string;
}

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
export type ThreadMode = ('Message' | 'Agent') | 'Chat';
export type ThreadStatus = 'Active' | 'Idle' | 'Closed';
export type PersistedActorRef =
  | {
      id: PrincipalId;
      kind: 'principal';
      [k: string]: unknown;
    }
  | {
      kind: 'system';
      [k: string]: unknown;
    };
export type PermissionBehavior = 'allow' | 'ask' | 'deny';
export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';
export type TurnPermissionProfileSource =
  'composer' | 'defaulted' | 'inherited_from_parent_turn' | 'task_permission_cap' | 'system';
export type PromptManifestDiagnosticCode =
  | 'missing_file'
  | 'file_read_error'
  | 'file_truncated'
  | 'total_budget_truncated'
  | 'file_filtered_by_profile'
  | 'dynamic_section_truncated'
  | 'dynamic_section_omitted'
  | 'hook_diagnostic'
  | 'hook_best_effort_failed'
  | 'capability_rejected';
export type PromptManifestHookPhase =
  | 'turn_pre_prompt_context'
  | 'turn_post_preflight_prompt_context'
  | 'turn_pre_prompt_compile'
  | 'runtime_turn_pre_context';
export type PromptManifestHookContributionKind =
  'prompt_context' | 'thread_context' | 'prompt_section' | 'prompt_manifest_diagnostic' | 'runtime_failure';
export type PromptManifestHookTruncation = 'none' | 'hook' | 'prompt' | 'hook_and_prompt' | 'unknown';
export type PromptManifestProfile = 'assistant_full' | 'assistant_minimal' | 'assistant_none' | 'cli_runtime';
export type TurnStatus = 'InProgress' | 'Completed' | 'Failed' | 'Interrupted' | 'Blocked';
/**
 * User-selectable visibility for ordinary user threads.
 *
 * Internal task/system threads deliberately have no public selectable value.
 */
export type ThreadVisibility = 'private' | 'workspace';
export type PrincipalStatus = 'active' | 'suspended' | 'removed';
export type WorkspaceId = string;

export interface ClientThreadScopePresentationRequest {
  auth: AuthMeResponse;
  capabilities: AuthorizationThreadCapabilities;
  participants: ThreadParticipantsResponse;
  thread: Thread;
  workspace_members: WorkspaceMemberListResponse;
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
export interface ThreadParticipantsResponse {
  changed?: boolean;
  /**
   * Compatibility list retained for clients predating participant summary
   * DTOs.
   */
  participant_ids?: PrincipalId[];
  participants?: ThreadParticipantSummary[];
  thread_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ThreadParticipantSummary {
  principal_id: PrincipalId;
  [k: string]: unknown;
}
export interface Thread {
  agent_nickname?: string | null;
  agent_role?: string | null;
  created_at: number;
  id: string;
  mode: ThreadMode;
  model: string;
  model_provider: string;
  name?: string | null;
  origin_kind?: ('task_run' | 'system') | 'collaborative' | 'direct_message' | 'user';
  preview: string;
  reasoning_effort?: string | null;
  sidebar_visibility?: 'visible' | 'hidden';
  status: ThreadStatus;
  turns: Turn[];
  updated_at: number;
  visibility?: ThreadVisibility | null;
  workspace_id: string;
  [k: string]: unknown;
}
export interface Turn {
  author?: TurnAuthorSnapshot | null;
  error?: string | null;
  id: string;
  mentions?: TurnMention[];
  message_deleted?: boolean;
  message_revision?: number;
  mode?: ('Message' | 'Agent') | 'Chat';
  origin?: 'user' | 'scheduled_task' | 'detached_task' | 'attached_task';
  permission_profile: TurnPermissionProfileSnapshot;
  prompt_manifest?: PromptManifest | null;
  reply_to_turn_id?: string | null;
  status: TurnStatus;
  turn_kind?: 'conversation' | 'task_run';
  [k: string]: unknown;
}
export interface TurnAuthorSnapshot {
  actor: PersistedActorRef;
  avatar_revision?: string | null;
  display_name: string;
  nickname: string;
  [k: string]: unknown;
}
export interface TurnMention {
  nickname: string;
  principal_id: PrincipalId;
  [k: string]: unknown;
}
export interface TurnPermissionProfileSnapshot {
  effective_policy: ToolPermissionPolicySnapshot;
  mode: TurnPermissionMode;
  source: TurnPermissionProfileSource;
  [k: string]: unknown;
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
export interface PromptManifest {
  compiler_version: string;
  diagnostics?: PromptManifestDiagnostic[];
  fingerprint_dynamic: string;
  fingerprint_full: string;
  fingerprint_stable: string;
  hook_sources?: PromptManifestHookSourceEntry[];
  profile: PromptManifestProfile;
  section_ids?: string[];
  [k: string]: unknown;
}
export interface PromptManifestDiagnostic {
  code: PromptManifestDiagnosticCode;
  file?: string | null;
  hook_source?: PromptManifestHookSource | null;
  message: string;
  section_id?: string | null;
  [k: string]: unknown;
}
export interface PromptManifestHookSource {
  contribution_hash?: string | null;
  contribution_id?: string | null;
  hook_id: string;
  phase: PromptManifestHookPhase;
  subscription_id: string;
  [k: string]: unknown;
}
export interface PromptManifestHookSourceEntry {
  contribution_kind: PromptManifestHookContributionKind;
  priority?: number | null;
  section_id?: string | null;
  source: PromptManifestHookSource;
  source_count?: number | null;
  truncation: PromptManifestHookTruncation;
  [k: string]: unknown;
}
export interface WorkspaceMemberListResponse {
  members: MemberSummary[];
  next_cursor?: string | null;
  workspace_id: WorkspaceId;
  [k: string]: unknown;
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
  role: AuthorizationRolePresentation;
  role_key?: RoleKey | null;
  status: PrincipalStatus;
  [k: string]: unknown;
}
/**
 * Server-owned role label. Clients display it verbatim and never infer
 * role semantics from `kind` or a well-known key.
 */
export interface AuthorizationRolePresentation {
  built_in: boolean;
  description: string;
  display_name: string;
  key: string;
}

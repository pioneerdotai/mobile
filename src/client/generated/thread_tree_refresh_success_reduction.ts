/* eslint-disable */

export type ThreadAgentsDocStatus = 'draft' | 'active' | 'archived';
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
export type PrincipalId = string;
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

export interface ThreadTreeRefreshSuccessReduction {
  agents_docs: ThreadAgentsDocSummary[];
  drive_thread_start_queue: boolean;
  ensure_thread_subscription?: ThreadTreeThreadAction | null;
  ensure_thread_timeline_loaded?: string | null;
  folders: ThreadFolder[];
  placements: ThreadPlacement[];
  request_thread_start_if_needed: boolean;
  set_active_thread_id?: string | null;
  set_preferred_workspace_id?: string | null;
  sync_composer_model_selection: boolean;
  threads: Thread[];
  unread: ThreadUnreadSummary[];
  workspace_id: string;
  [k: string]: unknown;
}
export interface ThreadAgentsDocSummary {
  char_count: number;
  content_sha256: string;
  folder_id?: string | null;
  id: string;
  status: ThreadAgentsDocStatus;
  updated_at: number;
  version: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ThreadTreeThreadAction {
  thread_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ThreadFolder {
  created_at: number;
  id: string;
  name: string;
  parent_folder_id?: string | null;
  updated_at: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ThreadPlacement {
  folder_id?: string | null;
  thread_id: string;
  workspace_id: string;
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
export interface ThreadUnreadSummary {
  thread_id: string;
  unread_count: number;
  [k: string]: unknown;
}

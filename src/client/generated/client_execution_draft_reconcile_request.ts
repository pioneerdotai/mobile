/* eslint-disable */

export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';
export type PermissionBehavior = 'allow' | 'ask' | 'deny';

export interface ClientExecutionDraftReconcileRequest {
  draft: ExecutionDraftSelection;
  policy: AuthorizationExecutionDraftPolicyProjection;
}
export interface ExecutionDraftSelection {
  has_attachments?: boolean;
  mcp_server_ids?: string[];
  model?: string | null;
  permission_mode?: TurnPermissionMode | null;
  policy_fingerprint?: string | null;
  provider?: string | null;
  skill_ids?: string[];
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

/* eslint-disable */

export type SkillId = string;
export type McpRuntimeState =
  | 'not_started'
  | 'disabled'
  | 'starting'
  | 'ready'
  | 'degraded'
  | 'auth_required'
  | 'failed'
  | 'stopping'
  | 'stopped'
  | 'restarting';
export type McpScopeKind = 'workspace' | 'user';
export type McpServerStatus =
  | 'not_started'
  | 'disabled'
  | 'starting'
  | 'ready'
  | 'degraded'
  | 'auth_required'
  | 'failed'
  | 'stopping'
  | 'stopped'
  | 'restarting';
export type McpOAuthState =
  | 'idle'
  | 'preparing'
  | 'awaiting_callback'
  | 'exchanging'
  | 'resolving'
  | 'retired'
  | 'cleanup_required'
  | 'authorized'
  | 'auth_required'
  | 'insufficient_scope'
  | 'denied'
  | 'cancelled'
  | 'timed_out'
  | 'failed';
export type McpSourceKind = 'config';
export type McpTransportSummary =
  | {
      command: string;
      kind: 'stdio';
      [k: string]: unknown;
    }
  | {
      kind: 'streamable_http';
      url: string;
      [k: string]: unknown;
    };
export type SkillPackId = string;

export interface PluginShellResponse {
  accepted: boolean;
  active_flows: string[];
  command_receipt?: PluginCommandReceipt | null;
  launches: NativeOAuthLaunch[];
  operation_id?: number | null;
  origin?: PluginCommandOrigin | null;
  parent?: PluginPublication | null;
  picker: PluginPickerRow[];
  [k: string]: unknown;
}
export interface PluginCommandReceipt {
  generation: number;
  origin: PluginCommandOrigin;
  parent_id: string;
  [k: string]: unknown;
}
export interface PluginCommandOrigin {
  authorization_sequence: number;
  connection_generation: number;
  connection_id?: number | null;
  [k: string]: unknown;
}
export interface NativeOAuthLaunch {
  authorization_url: string;
  flow_id: string;
  redirect_uri: string;
  server_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface PluginPublication {
  busy: boolean;
  connection_id?: number | null;
  details?: PluginItem | null;
  error?: string | null;
  generation: number;
  loaded: boolean;
  managing: boolean;
  mcp: McpListItem[];
  mcp_details: McpServerDetailsResponse[];
  mutation_uncertain: boolean;
  oauth: PluginOAuthPresentation[];
  operations: {
    [k: string]: PluginOperationPublication;
  };
  plugin_id?: string | null;
  plugins: PluginItem[];
  revision: number;
  skill_health: SkillHealthItem[];
  skills: SkillListItem[];
  [k: string]: unknown;
}
export interface PluginItem {
  components: PluginComponentItem[];
  description?: string | null;
  diagnostics: PluginDiagnostic[];
  enabled: boolean;
  id: string;
  name: string;
  revision: number;
  state: string;
  status: string;
  version?: string | null;
  metadata?: PluginMetadata;
  allow_implicit_invocation?: boolean;
  [k: string]: unknown;
}
export interface PluginComponentItem {
  diagnostic?: string | null;
  kind: string;
  mcp_installation_id?: string | null;
  member_key: string;
  runtime_status?: string | null;
  skill_id?: SkillId | null;
  status: string;
  [k: string]: unknown;
}
export interface PluginDiagnostic {
  code: string;
  message: string;
  path: string;
  [k: string]: unknown;
}
export interface PluginMetadata {
  display_name?: string | null;
  short_description?: string | null;
  description?: string | null;
  long_description?: string | null;
  developer_name?: string | null;
  homepage?: string | null;
  repository?: string | null;
  documentation_url?: string | null;
  support_url?: string | null;
  privacy_policy_url?: string | null;
  terms_of_service_url?: string | null;
  license?: string | null;
  category?: string | null;
  brand_color?: string | null;
  author?: PluginAuthor;
  keywords?: string[];
  default_prompts?: string[];
  logo?: ImageReference | null;
  composer_icon?: ImageReference | null;
  [k: string]: unknown;
}
/**
 * Authored presentation only. None of these fields grant execution authority.
 */
export interface PluginAuthor {
  name?: string | null;
  email?: string | null;
  url?: string | null;
  [k: string]: unknown;
}
/**
 * Immutable image reference. Gateway inventory exposes a native storage link, never image bytes.
 */
export interface ImageReference {
  path: string;
  revision: string;
  [k: string]: unknown;
}
export interface McpListItem {
  display_name?: string | null;
  id: string;
  name: string;
  plugin_owner?: PluginOwner | null;
  policy: McpPolicyState;
  prompts_count: number;
  required: ['type'];
  resource_templates_count: number;
  resources_count: number;
  runtime: McpRuntimeStatus;
  scope: McpScopeKind;
  status: McpServerStatus;
  tools_count: number;
  [k: string]: unknown;
}
export interface PluginOwner {
  member_key: string;
  plugin_id: string;
  [k: string]: unknown;
}
export interface McpPolicyState {
  allow_implicit_invocation: boolean;
  enabled: boolean;
  [k: string]: unknown;
}
export interface McpRuntimeStatus {
  last_seen_at?: number | null;
  live: boolean;
  state: McpRuntimeState;
  [k: string]: unknown;
}
export interface McpServerDetailsResponse {
  catalog: McpServerCatalogDetails;
  generated_at: number;
  /**
   * Management-only configuration and diagnostics. Omitted unless the
   * caller may manage the selected MCP installation.
   */
  management?: McpManagementDetails | null;
  server: McpListItem;
  snapshot_version: number;
  [k: string]: unknown;
}
export interface McpServerCatalogDetails {
  catalog_version?: string | null;
  generated_at?: number | null;
  prompts?: McpPromptCatalogItem[];
  resource_templates?: McpResourceTemplateCatalogItem[];
  resources?: McpResourceCatalogItem[];
  server_info?: {
    [k: string]: unknown;
  };
  server_instructions_hash?: string | null;
  tools?: McpToolCatalogItem[];
  [k: string]: unknown;
}
export interface McpPromptCatalogItem {
  arguments_count: number;
  description?: string | null;
  name: string;
  title?: string | null;
  [k: string]: unknown;
}
export interface McpResourceTemplateCatalogItem {
  description?: string | null;
  mime_type?: string | null;
  name?: string | null;
  title?: string | null;
  uri_template?: string | null;
  [k: string]: unknown;
}
export interface McpResourceCatalogItem {
  description?: string | null;
  mime_type?: string | null;
  name?: string | null;
  title?: string | null;
  uri?: string | null;
  [k: string]: unknown;
}
export interface McpToolCatalogItem {
  annotations?: McpToolAnnotationSummary | null;
  description?: string | null;
  input_schema_summary?: unknown;
  name: string;
  title?: string | null;
  [k: string]: unknown;
}
export interface McpToolAnnotationSummary {
  destructive_hint?: boolean | null;
  idempotent_hint?: boolean | null;
  open_world_hint?: boolean | null;
  read_only_hint?: boolean | null;
  title?: string | null;
  [k: string]: unknown;
}
/**
 * Configuration and diagnostics intentionally excluded from the operational
 * MCP capability returned by discovery endpoints.
 */
export interface McpManagementDetails {
  audit?: McpAuditEventSummary[];
  fingerprint: string;
  health: McpServerHealthDetails;
  /**
   * Device-neutral cleanup availability, including uncertain persistence.
   * False after confirmed Clear; omitted by older Gateways.
   */
  oauth_cleanup_available?: boolean | null;
  oauth_state?: McpOAuthState | null;
  recent_bindings?: McpTurnBindingSummary[];
  scope: McpScopeKind;
  source_kind: McpSourceKind;
  transport: McpTransportSummary;
  [k: string]: unknown;
}
export interface McpAuditEventSummary {
  action: string;
  callable_name?: string | null;
  catalog_version?: string | null;
  created_at: number;
  decision: string;
  details?: {
    [k: string]: unknown;
  };
  raw_tool_name?: string | null;
  reason_code?: string | null;
  server_installation_id?: string | null;
  server_name: string;
  turn_id?: string | null;
  [k: string]: unknown;
}
export interface McpServerHealthDetails {
  catalog_version?: string | null;
  last_error?: string | null;
  next_retry_at?: number | null;
  retry_attempt?: number | null;
  runtime: McpRuntimeStatus;
  status: McpServerStatus;
  status_reason?: string | null;
  stderr_tail?: string | null;
  [k: string]: unknown;
}
export interface McpTurnBindingSummary {
  callable_name: string;
  capability_id?: string | null;
  catalog_version: string;
  fingerprint: string;
  raw_tool_name: string;
  selection_reason: string;
  server_installation_id: string;
  server_name: string;
  [k: string]: unknown;
}
export interface PluginOAuthPresentation {
  browser_failed: boolean;
  flow_id?: string | null;
  server_id: string;
  state: McpOAuthState;
  [k: string]: unknown;
}
export interface PluginOperationPublication {
  busy: boolean;
  error?: string | null;
  generation: number;
  native_operation_id?: number | null;
  origin: PluginCommandOrigin;
  result?: PluginsMutationResponse | null;
  uncertain: boolean;
  [k: string]: unknown;
}
export interface PluginsMutationResponse {
  plugin?: PluginItem | null;
  removed: boolean;
  [k: string]: unknown;
}
export interface SkillHealthItem {
  dependency_diagnostics?: SkillDependencyDiagnostic[];
  owner?: string | null;
  recent_audit?: SkillAuditTimelineItem[];
  security_findings?: SkillSecurityFinding[];
  skill_id: SkillId;
  slug: string;
  source_kind: string;
  trust_gate?: SkillTrustGateStatus[];
  trust_level: string;
  validation_issues?: SkillValidationDiagnostic[];
  [k: string]: unknown;
}
export interface SkillDependencyDiagnostic {
  hint: string;
  kind: string;
  name: string;
  status: string;
  [k: string]: unknown;
}
export interface SkillAuditTimelineItem {
  action: string;
  created_at: number;
  decision: string;
  details_json: string;
  reason_code?: string | null;
  [k: string]: unknown;
}
export interface SkillSecurityFinding {
  message: string;
  path?: string | null;
  rule_id: string;
  severity: string;
  [k: string]: unknown;
}
export interface SkillTrustGateStatus {
  allowed: boolean;
  minimum_trust: string;
  tool_kind: string;
  [k: string]: unknown;
}
export interface SkillValidationDiagnostic {
  code: string;
  field_path?: string | null;
  level: string;
  message: string;
  [k: string]: unknown;
}
export interface SkillListItem {
  description: string;
  display_name: string;
  fingerprint: string;
  health: SkillHealthSummary;
  install: SkillInstallState;
  owner?: string | null;
  pack?: SkillPackMembership | null;
  plugin_owner?: PluginOwner | null;
  policy: SkillPolicyState;
  skill_id: SkillId;
  slug: string;
  source_kind: string;
  status: string;
  status_reason?: string | null;
  trust_level: string;
  version?: string | null;
  [k: string]: unknown;
}
export interface SkillHealthSummary {
  dependency_failures?: SkillDependencyDiagnostic[];
  security_blocks?: SkillSecurityFinding[];
  status: string;
  validation_issues?: SkillValidationDiagnostic[];
  [k: string]: unknown;
}
export interface SkillInstallState {
  install_path?: string | null;
  installed: boolean;
  lifecycle_editable?: boolean;
  managed: boolean;
  updated_at?: number | null;
  [k: string]: unknown;
}
export interface SkillPackMembership {
  member_key: string;
  pack_id: SkillPackId;
  [k: string]: unknown;
}
export interface SkillPolicyState {
  allow_implicit_invocation: boolean;
  allow_implicit_invocation_editable?: boolean;
  enabled: boolean;
  [k: string]: unknown;
}
export interface PluginPickerRow {
  description?: string | null;
  key: string;
  label: string;
  plugin_id: string;
  selectable: boolean;
  selected: boolean;
  stale: boolean;
  [k: string]: unknown;
}

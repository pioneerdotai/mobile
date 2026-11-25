/* eslint-disable */

export type SkillId = string;
/**
 * Product identity is distinct even when installation mechanics are shared.
 */
export type PackageKind = 'plugin' | 'app';
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
  app_view?: AppViewPublication | null;
  command_receipt?: PluginCommandReceipt | null;
  launches: NativeOAuthLaunch[];
  operation_id?: number | null;
  origin?: PluginCommandOrigin | null;
  parent?: PluginPublication | null;
  picker: PluginPickerRow[];
  view_ticket?: number | null;
  [k: string]: unknown;
}
export interface AppViewPublication {
  base_url?: string | null;
  development: boolean;
  expires_at?: number | null;
  state: string;
  title: string;
  url?: string | null;
  [k: string]: unknown;
}
/**
 * Admission identity, captured from this command's immutable publication.
 */
export interface PluginCommandReceipt {
  generation: number;
  origin: PluginCommandOrigin;
  parent_id: string;
  [k: string]: unknown;
}
/**
 * Captured connection and effective authorization at the shell submission.
 */
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
  /**
   * Failure of the shared catalog read. Operation failures are keyed below.
   */
  error?: string | null;
  generation: number;
  loaded: boolean;
  managing: boolean;
  mcp: McpListItem[];
  mcp_details: McpServerDetailsResponse[];
  /**
   * A dispatched mutation failed without an authoritative response. Refresh
   * or retry using the retained upload identity; never infer rollback.
   */
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
  allow_implicit_invocation?: boolean;
  components: PluginComponentItem[];
  /**
   * Authored package description, bounded by the Gateway; absent for old peers.
   */
  description?: string | null;
  diagnostics: PluginDiagnostic[];
  enabled: boolean;
  id: string;
  metadata?: PluginMetadata;
  name: string;
  revision: number;
  state: string;
  status: string;
  version?: string | null;
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
  app?: AppMetadata | null;
  author?: PluginAuthor;
  brand_color?: string | null;
  category?: string | null;
  composer_icon?: ImageReference | null;
  default_prompts?: string[];
  description?: string | null;
  developer_name?: string | null;
  display_name?: string | null;
  documentation_url?: string | null;
  homepage?: string | null;
  keywords?: string[];
  license?: string | null;
  logo?: ImageReference | null;
  long_description?: string | null;
  privacy_policy_url?: string | null;
  repository?: string | null;
  short_description?: string | null;
  support_url?: string | null;
  terms_of_service_url?: string | null;
  [k: string]: unknown;
}
/**
 * Verified presentation snapshot only; native authority remains in components.
 */
export interface AppMetadata {
  categories: string[];
  composer_icon?: AppThemedIcon | null;
  default_locale?: string | null;
  developer_logo?: AppThemedIcon | null;
  developer_url?: string | null;
  has_ui?: boolean;
  icon?: AppThemedIcon | null;
  localizations: {
    [k: string]: AppLocalization;
  };
  [k: string]: unknown;
}
export interface AppThemedIcon {
  dark: ImageReference;
  light: ImageReference;
  [k: string]: unknown;
}
/**
 * Immutable image reference. Published paths are authenticated Gateway storage links.
 */
export interface ImageReference {
  path: string;
  revision: string;
  [k: string]: unknown;
}
export interface AppLocalization {
  longDescription?: string | null;
  name?: string | null;
  shortDescription?: string | null;
  [k: string]: unknown;
}
/**
 * Authored presentation only. None of these fields grant execution authority.
 */
export interface PluginAuthor {
  email?: string | null;
  name?: string | null;
  url?: string | null;
  [k: string]: unknown;
}
export interface McpListItem {
  display_name?: string | null;
  id: string;
  name: string;
  package_owner?: PackageOwner | null;
  plugin_owner?: PluginOwner | null;
  policy: McpPolicyState;
  prompts_count: number;
  required: boolean;
  resource_templates_count: number;
  resources_count: number;
  runtime: McpRuntimeStatus;
  scope: McpScopeKind;
  status: McpServerStatus;
  tools_count: number;
  [k: string]: unknown;
}
export interface PackageOwner {
  kind: PackageKind;
  member_key: string;
  package_id: string;
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
/**
 * Secret-free native authorization presentation, shared by management shells.
 */
export interface PluginOAuthPresentation {
  browser_failed: boolean;
  flow_id?: string | null;
  server_id: string;
  state: McpOAuthState;
  [k: string]: unknown;
}
/**
 * A parent's operation outcome is independent of other visible parents.
 */
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
  package_owner?: PackageOwner | null;
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
/**
 * Parent-only presentation for immediate pickers. Selection retains its original
 * revision even when catalog labels/revisions refresh. Desktop picker migration:
 * use these rows in place of shell-local eligibility and selected-key checks.
 */
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

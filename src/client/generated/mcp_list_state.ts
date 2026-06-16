/* eslint-disable */

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
export type McpScopeKind = 'workspace' | 'user';
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

export interface McpListState {
  details_loading: boolean;
  details_refresh_requested: boolean;
  error?: string | null;
  loading: boolean;
  pending_actions: string[];
  poller_started: boolean;
  refresh_requested: boolean;
  selected_server_id?: string | null;
  server_details?: McpServerDetailsResponse | null;
  servers: McpListItem[];
  [k: string]: unknown;
}
export interface McpServerDetailsResponse {
  audit?: McpAuditEventSummary[];
  catalog: McpServerCatalogDetails;
  generated_at: number;
  health: McpServerHealthDetails;
  recent_bindings?: McpTurnBindingSummary[];
  server: McpListItem;
  snapshot_version: number;
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
export interface McpRuntimeStatus {
  last_error?: string | null;
  last_seen_at?: number | null;
  live: boolean;
  state: McpRuntimeState;
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
export interface McpListItem {
  display_name?: string | null;
  fingerprint: string;
  id: string;
  name: string;
  policy: McpPolicyState;
  prompts_count: number;
  required: boolean;
  resource_templates_count: number;
  resources_count: number;
  runtime: McpRuntimeStatus;
  scope: McpScopeKind;
  source_kind: McpSourceKind;
  status: McpServerStatus;
  status_reason?: string | null;
  tools_count: number;
  transport: McpTransportSummary;
  [k: string]: unknown;
}
export interface McpPolicyState {
  allow_implicit_invocation: boolean;
  enabled: boolean;
  [k: string]: unknown;
}

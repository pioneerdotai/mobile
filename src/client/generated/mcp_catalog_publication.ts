/* eslint-disable */

export type McpLoadState = 'idle' | 'loading' | 'ready' | 'failed' | 'cancelled' | 'forbidden';
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

export interface McpCatalogPublication {
  request: McpLoadState;
  revision: number;
  servers: McpListItem[];
  workspace_id: string;
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

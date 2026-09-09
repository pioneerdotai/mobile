/* eslint-disable */

export type McpLoadState = 'idle' | 'loading' | 'ready' | 'failed' | 'cancelled' | 'forbidden';
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

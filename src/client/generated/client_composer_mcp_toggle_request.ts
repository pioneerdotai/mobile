/* eslint-disable */

export type McpScopeKind = 'workspace' | 'user';
export type McpCapabilityUnavailableReason =
  | 'DisabledByPolicy'
  | 'RuntimeUnavailable'
  | 'RuntimeNotReady'
  | 'NoToolCatalog';

export interface ClientComposerMcpToggleRequest {
  row: SelectableMcpCapability;
  selected_keys: string[];
  server_rows: SelectableMcpCapability[];
  tool_rows: SelectableMcpCapability[];
}
export interface SelectableMcpCapability {
  description: string;
  key: string;
  label: string;
  raw_tool_name?: string | null;
  scope_kind: McpScopeKind;
  selectable: boolean;
  server_id: string;
  server_name: string;
  tools_count?: number | null;
  unavailable_reason?: McpCapabilityUnavailableReason | null;
  [k: string]: unknown;
}

/* eslint-disable */

export interface PluginShellResponse {
  accepted: boolean;
  active_flows: string[];
  launches: NativeOAuthLaunch[];
  operation_id?: number | null;
  picker: PluginPickerRow[];
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
/**
 * Parent-only presentation for immediate pickers. Selection retains its original
 * revision even when catalog labels/revisions refresh. Desktop picker migration:
 * use these rows in place of shell-local eligibility and selected-key checks.
 */
export interface PluginPickerRow {
  key: string;
  label: string;
  plugin_id: string;
  selectable: boolean;
  selected: boolean;
  stale: boolean;
  [k: string]: unknown;
}

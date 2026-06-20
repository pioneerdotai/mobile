/* eslint-disable */

export interface CLIRuntimeAppsChangedNotification {
  apps: RuntimeAppInfo[];
  refreshed_at_unix_ms?: number | null;
  runtime_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface RuntimeAppInfo {
  account_label?: string | null;
  description?: string | null;
  enabled?: boolean;
  id: string;
  name: string;
  payload?: unknown;
  status?: string | null;
  [k: string]: unknown;
}

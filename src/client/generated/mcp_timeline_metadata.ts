/* eslint-disable */

export interface McpTimelineMetadata {
  catalog_version?: string | null;
  duration_ms?: number | null;
  raw_tool_name: string;
  result_truncated?: boolean | null;
  runtime_state?: string | null;
  server_id?: string | null;
  server_name: string;
  snapshot_version?: number | null;
  [k: string]: unknown;
}

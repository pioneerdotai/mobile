/* eslint-disable */

/**
 * Legacy protocol-v1 alias for reading the Gateway-owned readiness snapshot.
 *
 * Despite the method's historical `refresh` name, this request never starts
 * provider work. The Gateway supervisor owns probing and publishes newer
 * snapshots asynchronously through `cli_runtime/status_changed`.
 */
export interface CLIRuntimeRefreshParams {
  /**
   * Optional legacy validation target. Gateway readiness is maintained as
   * one atomic workspace snapshot, so the response still contains every
   * authorized runtime in the workspace.
   */
  runtime_id?: string | null;
  workspace_id: string;
  [k: string]: unknown;
}

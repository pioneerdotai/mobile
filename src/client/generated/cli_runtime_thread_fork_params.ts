/* eslint-disable */

export interface CLIRuntimeThreadForkParams {
  fork_thread_id: string;
  name?: string | null;
  runtime_id: string;
  source_thread_id: string;
  workspace_id: string;
  [k: string]: unknown;
}

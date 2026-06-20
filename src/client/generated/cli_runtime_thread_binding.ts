/* eslint-disable */

export type CLIAgentRuntimeKind = 'codex' | 'claude';

export interface CLIRuntimeThreadBinding {
  native_cwd?: string | null;
  native_model?: string | null;
  native_thread_id: string;
  runtime_id: string;
  runtime_kind: CLIAgentRuntimeKind;
  status: string;
  thread_id: string;
  workspace_id: string;
  [k: string]: unknown;
}

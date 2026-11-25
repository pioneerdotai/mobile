/* eslint-disable */

export type CLIAgentRuntimeKind = 'codex' | 'claude';

export interface CLIRuntimeThreadBinding {
  runtime_id: string;
  runtime_kind: CLIAgentRuntimeKind;
  status: string;
  thread_id: string;
  workspace_id: string;
  [k: string]: unknown;
}

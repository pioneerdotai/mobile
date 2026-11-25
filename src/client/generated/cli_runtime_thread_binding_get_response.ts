/* eslint-disable */

export type CLIAgentRuntimeKind = 'codex' | 'claude';

export interface CLIRuntimeThreadBindingGetResponse {
  binding?: CLIRuntimeThreadBinding | null;
  management?: CLIRuntimeThreadBindingManagement | null;
  [k: string]: unknown;
}
export interface CLIRuntimeThreadBinding {
  runtime_id: string;
  runtime_kind: CLIAgentRuntimeKind;
  status: string;
  thread_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
/**
 * Operator-only native session metadata, structurally separate from the
 * operational binding consumed by Desktop and Mobile.
 */
export interface CLIRuntimeThreadBindingManagement {
  native_cwd?: string | null;
  native_model?: string | null;
  native_thread_id: string;
  [k: string]: unknown;
}

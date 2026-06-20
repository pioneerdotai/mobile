/* eslint-disable */

export type CLIRuntimeRequestKind = 'command_approval' | 'file_change_approval' | 'user_input' | 'other';

export interface CLIRuntimePendingRequest {
  kind: CLIRuntimeRequestKind;
  message?: string | null;
  native_request_id?: string | null;
  payload?: unknown;
  title?: string | null;
  [k: string]: unknown;
}

/* eslint-disable */

export type CLIRuntimeRequestKind =
  'command_approval' | 'file_change_approval' | 'permission_approval' | 'user_input' | 'other';

export interface CLIRuntimeRequestOpenedNotification {
  item_id?: string | null;
  request: CLIRuntimePendingRequest;
  request_id: string;
  runtime_id: string;
  thread_id?: string | null;
  turn_id?: string | null;
  /**
   * Additional ancestor Thread capsules in which this child execution
   * request is intentionally visible and actionable.
   */
  visible_thread_ids?: string[];
  workspace_id: string;
  [k: string]: unknown;
}
export interface CLIRuntimePendingRequest {
  kind: CLIRuntimeRequestKind;
  message?: string | null;
  native_request_id?: string | null;
  payload?: unknown;
  title?: string | null;
  [k: string]: unknown;
}

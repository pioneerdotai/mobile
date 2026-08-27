/* eslint-disable */

export type CLIRuntimeRequestResolution =
  | {
      status: 'approved';
      [k: string]: unknown;
    }
  | {
      status: 'approved_for_session';
      [k: string]: unknown;
    }
  | {
      reason?: string | null;
      status: 'denied';
      [k: string]: unknown;
    }
  | {
      status: 'cancelled';
      [k: string]: unknown;
    }
  | {
      response?: unknown;
      status: 'answered';
      [k: string]: unknown;
    }
  | {
      status: 'expired';
      [k: string]: unknown;
    }
  | {
      message: string;
      status: 'error';
      [k: string]: unknown;
    };

export interface CLIRuntimeRequestResolvedNotification {
  item_id?: string | null;
  request_id: string;
  resolution: CLIRuntimeRequestResolution;
  runtime_id: string;
  thread_id?: string | null;
  turn_id?: string | null;
  /**
   * Mirrors the opened notification so clients can remove an ancestor-
   * projected request without waiting for a separate timeline refresh.
   */
  visible_thread_ids?: string[];
  workspace_id: string;
  [k: string]: unknown;
}

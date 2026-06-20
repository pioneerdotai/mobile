/* eslint-disable */

export type CLIRuntimeRequestResolution =
  | {
      status: 'approved';
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
export type CLIRuntimePendingRequestStatus = 'pending' | 'answered' | 'resolved' | 'cancelled' | 'expired';

export interface CLIRuntimeRequestRespondResponse {
  item_id?: string | null;
  request_id: string;
  resolution: CLIRuntimeRequestResolution;
  runtime_id: string;
  status: CLIRuntimePendingRequestStatus;
  thread_id?: string | null;
  turn_id?: string | null;
  workspace_id: string;
  [k: string]: unknown;
}

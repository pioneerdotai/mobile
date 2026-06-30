/* eslint-disable */

export type ClientPendingRequestResponseAction =
  | {
      method: string;
      params: CLIRuntimeRequestRespondParams;
      target: 'cli_runtime';
      [k: string]: unknown;
    }
  | {
      method: string;
      params: TurnPermissionRequestRespondParams;
      target: 'native_permission_gate';
      [k: string]: unknown;
    };
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
export type TurnPermissionApprovalResolution = 'allow_once' | 'allow_for_turn' | 'deny' | 'cancelled' | 'expired';

export interface ClientPendingRequestResponsePlanResult {
  action: ClientPendingRequestResponseAction;
  [k: string]: unknown;
}
export interface CLIRuntimeRequestRespondParams {
  request_id: string;
  resolution: CLIRuntimeRequestResolution;
  runtime_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface TurnPermissionRequestRespondParams {
  request_id: string;
  resolution: TurnPermissionApprovalResolution;
  [k: string]: unknown;
}

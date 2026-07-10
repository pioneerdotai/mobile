/* eslint-disable */

export type PendingRequestKind = 'command_approval' | 'file_change_approval' | 'user_input' | 'other';
export type PendingRequestOrigin =
  | {
      origin: 'cli_runtime';
      runtime_id: string;
      [k: string]: unknown;
    }
  | {
      origin: 'native_permission_gate';
      [k: string]: unknown;
    };
export type PendingRequestPayload =
  | {
      request: CLIRuntimePendingRequest;
      source: 'cli_runtime';
      [k: string]: unknown;
    }
  | {
      request: TurnPermissionApprovalRequest;
      source: 'native_permission_gate';
      [k: string]: unknown;
    }
  | {
      payload?: unknown;
      source: 'other';
      [k: string]: unknown;
    };
export type CLIRuntimeRequestKind = 'command_approval' | 'file_change_approval' | 'user_input' | 'other';
export type TurnPermissionActionKind =
  | 'file_read'
  | 'file_write'
  | 'shell_command'
  | 'network'
  | 'mcp_read'
  | 'mcp_write_or_unknown'
  | 'dynamic_skill_tool'
  | 'computer_use'
  | 'task_subagent'
  | 'internal'
  | 'unknown';
export type TurnPermissionDecisionReason =
  | 'full_access'
  | 'policy_allows_action'
  | 'policy_requires_approval'
  | 'policy_denies_action'
  | 'cached_approval'
  | 'user_approved'
  | 'user_denied'
  | 'cancelled'
  | 'expired'
  | 'unknown_action_default'
  | 'sandbox_denied';
export type PendingRequestResolution =
  | {
      resolution: 'allow';
      [k: string]: unknown;
    }
  | {
      resolution: 'allow_for_turn';
      [k: string]: unknown;
    }
  | {
      resolution: 'allow_for_session';
      [k: string]: unknown;
    }
  | {
      reason?: string | null;
      resolution: 'deny';
      [k: string]: unknown;
    }
  | {
      resolution: 'cancel';
      [k: string]: unknown;
    }
  | {
      resolution: 'answered';
      response?: unknown;
      [k: string]: unknown;
    }
  | {
      resolution: 'expired';
      [k: string]: unknown;
    };

export interface ClientPendingRequestResponsePlanRequest {
  request: PendingRequest;
  resolution: PendingRequestResolution;
}
export interface PendingRequest {
  item_id?: string | null;
  kind: PendingRequestKind;
  message?: string | null;
  native_request_id?: string | null;
  origin: PendingRequestOrigin;
  payload: PendingRequestPayload;
  request_id: string;
  thread_id?: string | null;
  title?: string | null;
  turn_id?: string | null;
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
export interface TurnPermissionApprovalRequest {
  action: TurnPermissionActionKind;
  details?: TurnPermissionApprovalRequestDetail[];
  reason: TurnPermissionDecisionReason;
  request_id: string;
  scope_hash: string;
  summary?: string | null;
  thread_id: string;
  tool_name: string;
  turn_id: string;
  visible_thread_ids?: string[];
  workspace_id: string;
  [k: string]: unknown;
}
export interface TurnPermissionApprovalRequestDetail {
  label: string;
  monospace?: boolean;
  value: string;
  [k: string]: unknown;
}

/* eslint-disable */

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
  | 'memory_write'
  | 'agent_action'
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

export interface TurnPermissionRequestOpenedNotification {
  request: TurnPermissionApprovalRequest;
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

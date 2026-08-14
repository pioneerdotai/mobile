/* eslint-disable */

export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';
export type ExecutionDraftReconciliationKind =
  'policy_generation' | 'provider' | 'model' | 'permission_mode' | 'skill' | 'mcp_server' | 'attachment';

export interface ExecutionDraftReconciliation {
  changed: boolean;
  draft: ExecutionDraftSelection;
  reasons?: ExecutionDraftReconciliationReason[];
}
export interface ExecutionDraftSelection {
  has_attachments?: boolean;
  mcp_server_ids?: string[];
  model?: string | null;
  permission_mode?: TurnPermissionMode | null;
  policy_fingerprint?: string | null;
  provider?: string | null;
  skill_ids?: string[];
}
export interface ExecutionDraftReconciliationReason {
  kind: ExecutionDraftReconciliationKind;
  reason: string;
  resource_id?: string | null;
}

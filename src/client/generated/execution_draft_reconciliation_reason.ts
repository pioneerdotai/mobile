/* eslint-disable */

export type ExecutionDraftReconciliationKind =
  'policy_generation' | 'provider' | 'model' | 'permission_mode' | 'skill' | 'mcp_server' | 'attachment';

export interface ExecutionDraftReconciliationReason {
  kind: ExecutionDraftReconciliationKind;
  reason: string;
  resource_id?: string | null;
}

/* eslint-disable */

export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';

export interface ExecutionDraftSelection {
  has_attachments?: boolean;
  mcp_server_ids?: string[];
  model?: string | null;
  permission_mode?: TurnPermissionMode | null;
  policy_fingerprint?: string | null;
  provider?: string | null;
  skill_ids?: string[];
}

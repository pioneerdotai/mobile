/* eslint-disable */

/**
 * Shell-neutral, non-serializable invitation join phase.
 *
 * The phase is safe to project into UI state. The secret presentation itself
 * remains owned by [`InvitationJoinFlow`] and is never part of a snapshot.
 */
export type InvitationJoinPhase =
  'parsing' | 'previewing' | 'editing_profile' | 'accepting' | 'committing' | 'complete' | 'terminal';
export type GatewayId = string;
export type PrincipalKind = 'superuser' | 'user';
export type PrincipalId = string;
export type RoleKey = string;
export type InvitationTransportSecurity = 'secure_wss' | 'insecure_ws';
export type WorkspaceId = string;

export interface InvitationPublication {
  active: boolean;
  avatar_error?: string | null;
  avatar_preview?: string | null;
  can_cancel: boolean;
  completed_endpoint?: string | null;
  error?: string | null;
  first_name: string;
  last_name: string;
  name_error?: string | null;
  name_valid: boolean;
  nickname: string;
  nickname_error?: string | null;
  nickname_valid: boolean;
  owner_generation: number;
  phase: InvitationJoinPhase;
  preview?: InvitationPreviewResponse | null;
  preview_pending: boolean;
  revision: number;
  submitting: boolean;
  username_editing: boolean;
  [k: string]: unknown;
}
export interface InvitationPreviewResponse {
  expires_at_unix: number;
  gateway_display_name?: string | null;
  gateway_id: GatewayId;
  inviter: InvitationInviterSummary;
  role_key: RoleKey;
  transport: InvitationTransportSecurity;
  workspaces: InvitationWorkspaceSummary[];
  [k: string]: unknown;
}
export interface InvitationInviterSummary {
  display_name: string;
  kind: PrincipalKind;
  nickname: string;
  principal_id: PrincipalId;
  [k: string]: unknown;
}
export interface InvitationWorkspaceSummary {
  name: string;
  workspace_id: WorkspaceId;
  [k: string]: unknown;
}

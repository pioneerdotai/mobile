/* eslint-disable */

export type InvitationId = string;
export type PrincipalKind = 'superuser' | 'user';
export type PrincipalId = string;
export type InvitationRevokeReason =
  'inviter_revoked' | 'inviter_unavailable' | 'grant_authority_lost' | 'workspace_unavailable';
export type RoleKey = string;
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
export type WorkspaceId = string;
export type GatewayId = string;

export interface InvitationCreateResponse {
  invitation: InvitationSummary;
  presentation: InvitationPresentation;
  [k: string]: unknown;
}
export interface InvitationSummary {
  created_at_unix: number;
  expires_at_unix: number;
  invitation_id: InvitationId;
  inviter: InvitationInviterSummary;
  revoke_reason?: InvitationRevokeReason | null;
  role_key: RoleKey;
  status: InvitationStatus;
  terminal_at_unix?: number | null;
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
export interface InvitationPresentation {
  deep_link: string;
  gateway_base_url: string;
  gateway_id: GatewayId;
  token: string;
}

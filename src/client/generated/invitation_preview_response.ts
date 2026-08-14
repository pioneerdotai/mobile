/* eslint-disable */

export type GatewayId = string;
export type PrincipalKind = 'superuser' | 'user';
export type PrincipalId = string;
export type RoleKey = string;
export type InvitationTransportSecurity = 'secure_wss' | 'insecure_ws';
export type WorkspaceId = string;

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

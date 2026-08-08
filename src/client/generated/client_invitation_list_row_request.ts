/* eslint-disable */

export type ClientKind = 'desktop' | 'mobile' | 'other';
export type DeviceId = string;
export type DeviceStatus = 'pending' | 'active' | 'revoked';
export type GatewayId = string;
export type PrincipalId = string;
export type PrincipalKind = 'superuser' | 'user';
export type RoleKey = string;
export type AuthSessionId = string;
export type AuthSessionStatus = 'pending' | 'active' | 'revoked' | 'expired';
export type TokenFamilyId = string;
export type InvitationId = string;
export type InvitationRevokeReason =
  'inviter_revoked' | 'inviter_unavailable' | 'grant_authority_lost' | 'workspace_unavailable';
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
export type WorkspaceId = string;

export interface ClientInvitationListRowRequest {
  auth: AuthMeResponse;
  invitation: InvitationSummary;
}
export interface AuthMeResponse {
  device: AuthDeviceSnapshot;
  gateway: AuthGatewaySnapshot;
  principal: AuthPrincipalSnapshot;
  role_key?: RoleKey | null;
  session: AuthSessionSnapshot;
  [k: string]: unknown;
}
export interface AuthDeviceSnapshot {
  client_kind: ClientKind;
  display_name: string;
  id: DeviceId;
  installation_id: string;
  status: DeviceStatus;
  [k: string]: unknown;
}
export interface AuthGatewaySnapshot {
  id: GatewayId;
  [k: string]: unknown;
}
export interface AuthPrincipalSnapshot {
  display_name: string;
  id: PrincipalId;
  kind: PrincipalKind;
  nickname: string;
  [k: string]: unknown;
}
export interface AuthSessionSnapshot {
  device_id: DeviceId;
  id: AuthSessionId;
  refresh_expires_at_unix: number;
  refresh_generation: number;
  status: AuthSessionStatus;
  token_family_id: TokenFamilyId;
  [k: string]: unknown;
}
export interface InvitationSummary {
  created_at_unix: number;
  expires_at_unix: number;
  invitation_id: InvitationId;
  inviter: InvitationInviterSummary;
  revoke_reason?: InvitationRevokeReason | null;
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

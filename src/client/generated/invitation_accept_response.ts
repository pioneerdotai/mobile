/* eslint-disable */

export type CredentialStorageOrder = 'persist_refresh_before_activating_access';
export type ClientKind = 'desktop' | 'mobile' | 'other';
export type DeviceId = string;
export type DeviceStatus = 'pending' | 'active' | 'revoked';
export type GatewayId = string;
export type PrincipalId = string;
export type PrincipalKind = 'superuser' | 'user';
export type AuthSessionId = string;
export type AuthSessionStatus = 'pending' | 'active' | 'revoked' | 'expired';
export type TokenFamilyId = string;
export type RoleKey = string;
export type PrincipalStatus = 'active' | 'suspended' | 'removed';
export type WorkspaceId = string;

export interface InvitationAcceptResponse {
  grant: AuthSessionGrant;
  member: MemberSummary;
  workspace_ids: WorkspaceId[];
  [k: string]: unknown;
}
export interface AuthSessionGrant {
  access_expires_at_unix: number;
  access_token: string;
  auth_protocol_version: number;
  credential_storage_order: CredentialStorageOrder;
  device: AuthDeviceSnapshot;
  gateway: AuthGatewaySnapshot;
  principal: AuthPrincipalSnapshot;
  refresh_expires_at_unix: number;
  refresh_generation: number;
  refresh_token: string;
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
  avatar_revision?: string | null;
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
export interface MemberSummary {
  avatar_revision?: string | null;
  display_name: string;
  kind: PrincipalKind;
  /**
   * Server-owned target trait. Clients may combine it with caller
   * capabilities for presentation, but never infer it from identity kind
   * or a well-known role key.
   */
  lifecycle_managed: boolean;
  nickname: string;
  principal_id: PrincipalId;
  role: AuthorizationRolePresentation;
  role_key?: RoleKey | null;
  status: PrincipalStatus;
  [k: string]: unknown;
}
/**
 * Server-owned role label. Clients display it verbatim and never infer
 * role semantics from `kind` or a well-known key.
 */
export interface AuthorizationRolePresentation {
  built_in: boolean;
  description: string;
  display_name: string;
  key: string;
}

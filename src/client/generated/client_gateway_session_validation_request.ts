/* eslint-disable */

export type ClientGatewaySessionValidationRequest =
  | {
      envelope: unknown;
      kind: 'envelope';
    }
  | {
      envelope: GatewaySessionEnvelope;
      grant: AuthRefreshGrant;
      installation_id: string;
      kind: 'refresh';
    }
  | {
      envelope: GatewaySessionEnvelope;
      identity: AuthMeResponse;
      installation_id: string;
      kind: 'identity';
    };
export type DeviceId = string;
export type GatewayId = string;
export type PrincipalId = string;
export type AuthSessionId = string;
export type TokenFamilyId = string;
export type CredentialStorageOrder = 'persist_refresh_before_activating_access';
export type ClientKind = 'desktop' | 'mobile' | 'other';
export type DeviceStatus = 'pending' | 'active' | 'revoked';
export type PrincipalKind = 'superuser' | 'user';
export type AuthSessionStatus = 'pending' | 'active' | 'revoked' | 'expired';
export type RoleKey = string;

export interface GatewaySessionEnvelope {
  device_id: DeviceId;
  gateway_id: GatewayId;
  installation_id: string;
  pending_refresh_request_id?: string | null;
  principal_id: PrincipalId;
  refresh_expires_at_unix: number;
  refresh_generation: number;
  refresh_token: string;
  schema_version: number;
  session_id: AuthSessionId;
  token_family_id: TokenFamilyId;
}
export interface AuthRefreshGrant {
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
export interface AuthMeResponse {
  device: AuthDeviceSnapshot;
  gateway: AuthGatewaySnapshot;
  principal: AuthPrincipalSnapshot;
  role_key?: RoleKey | null;
  session: AuthSessionSnapshot;
  [k: string]: unknown;
}

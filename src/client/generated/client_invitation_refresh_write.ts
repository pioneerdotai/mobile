/* eslint-disable */

export type ClientKind = 'desktop' | 'mobile' | 'other';
export type DeviceId = string;
export type GatewayId = string;
export type PrincipalId = string;
export type AuthSessionId = string;
export type TokenFamilyId = string;

export interface ClientInvitationRefreshWrite {
  client_kind: ClientKind;
  device_id: DeviceId;
  gateway_id: GatewayId;
  installation_id: string;
  principal_id: PrincipalId;
  refresh_expires_at_unix: number;
  refresh_generation: number;
  refresh_token: string;
  session_id: AuthSessionId;
  token_family_id: TokenFamilyId;
  [k: string]: unknown;
}

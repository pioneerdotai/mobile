/* eslint-disable */

export type DeviceId = string;
export type GatewayId = string;
export type PrincipalId = string;
export type AuthSessionId = string;

export interface ClientInvitationAccessResult {
  access_expires_at_unix: number;
  access_token: string;
  device_id: DeviceId;
  gateway_id: GatewayId;
  principal_id: PrincipalId;
  session_id: AuthSessionId;
  [k: string]: unknown;
}

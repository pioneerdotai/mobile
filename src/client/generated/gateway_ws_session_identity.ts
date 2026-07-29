/* eslint-disable */

export type DeviceId = string;
export type GatewayId = string;
export type AuthSessionId = string;

export interface GatewayWsSessionIdentity {
  access_expires_at_unix: number;
  device_id: DeviceId;
  refresh_leeway_seconds: number;
  server_gateway_id: GatewayId;
  session_id: AuthSessionId;
  [k: string]: unknown;
}

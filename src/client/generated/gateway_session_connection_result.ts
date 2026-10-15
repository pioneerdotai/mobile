/* eslint-disable */

export type DeviceId = string;
export type GatewayId = string;
export type AuthSessionId = string;

export interface GatewaySessionConnectionResult {
  access_expires_at_unix: number;
  connection_generation: number;
  connection_id: number;
  metadata: GatewaySessionMetadata;
  [k: string]: unknown;
}
export interface GatewaySessionMetadata {
  device_id: DeviceId;
  gateway_id: GatewayId;
  refresh_expires_at_unix: number;
  refresh_generation: number;
  session_id: AuthSessionId;
  [k: string]: unknown;
}

/* eslint-disable */

export type DeviceId = string;
export type GatewayId = string;
export type AuthSessionId = string;

export interface AuthDeviceCreateResponse {
  activation_code: string;
  device_id: DeviceId;
  expires_at_unix: number;
  gateway_id: GatewayId;
  session_id: AuthSessionId;
  [k: string]: unknown;
}

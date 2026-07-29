/* eslint-disable */

export type DeviceId = string;
export type GatewayId = string;
export type AuthSessionId = string;

export interface ClientDeviceActivationPresentationResult {
  deep_link: string;
  device_id: DeviceId;
  expires_at_unix: number;
  gateway_id: GatewayId;
  manual_code: string;
  protected_endpoint: string;
  qr_modules: boolean[];
  qr_width: number;
  session_id: AuthSessionId;
  [k: string]: unknown;
}

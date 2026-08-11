/* eslint-disable */

/**
 * The custom URL scheme owned by a Pioneer application build.
 *
 * Debug builds default to the development scheme so they can coexist with an
 * installed production application. Release packaging can override the
 * default at compile time with `PIONEER_APP_URL_SCHEME`.
 */
export type PioneerAppUrlScheme = 'pioneer' | 'pioneer-dev';
export type DeviceId = string;
export type GatewayId = string;
export type AuthSessionId = string;

export interface ClientDeviceActivationPresentationRequest {
  app_url_scheme: PioneerAppUrlScheme;
  created_device: AuthDeviceCreateResponse;
  gateway_base_url: string;
}
export interface AuthDeviceCreateResponse {
  activation_code: string;
  device_id: DeviceId;
  expires_at_unix: number;
  gateway_id: GatewayId;
  session_id: AuthSessionId;
  [k: string]: unknown;
}

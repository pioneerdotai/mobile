/* eslint-disable */

export type GatewayId = string;

export interface ClientDeviceActivationParseResult {
  activation_code: string;
  gateway_id: GatewayId;
  protected_endpoint: string;
  [k: string]: unknown;
}

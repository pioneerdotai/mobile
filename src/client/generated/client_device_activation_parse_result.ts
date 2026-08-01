/* eslint-disable */

export type GatewayId = string;

export interface ClientDeviceActivationParseResult {
  activation_code: string;
  gateway_base_url: string;
  gateway_id: GatewayId;
  [k: string]: unknown;
}

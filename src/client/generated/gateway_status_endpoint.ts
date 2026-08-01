/* eslint-disable */

export type GatewayEndpointKind = 'local' | 'remote';

export interface GatewayStatusEndpoint {
  gateway_base_url: string;
  kind: GatewayEndpointKind;
  name: string;
  [k: string]: unknown;
}

/* eslint-disable */

export type GatewayEndpointKind = 'local' | 'remote';

export interface GatewayStatusEndpoint {
  address: string;
  kind: GatewayEndpointKind;
  name: string;
  [k: string]: unknown;
}

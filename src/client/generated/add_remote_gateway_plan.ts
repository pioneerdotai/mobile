/* eslint-disable */

export type GatewayEndpointKind = 'local' | 'remote';

export interface AddRemoteGatewayPlan {
  endpoint: GatewayEndpoint;
  previous_endpoint?: GatewayEndpoint | null;
  token_write?: GatewayAuthTokenWrite | null;
  [k: string]: unknown;
}
export interface GatewayEndpoint {
  address: string;
  auth_token_ref?: string | null;
  id: string;
  kind: GatewayEndpointKind;
  name: string;
  service_name?: string | null;
  workspace_id?: string | null;
}
export interface GatewayAuthTokenWrite {
  label: string;
  token: string;
  token_ref: string;
}

/* eslint-disable */

export type GatewayEndpointKind = 'local' | 'remote';

export interface AddAndActivateRemoteGatewayRegistryPlan {
  endpoint: GatewayEndpoint;
  previous_active_gateway_id?: string | null;
  previous_endpoint?: GatewayEndpoint | null;
  registry: GatewayRegistry;
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
export interface GatewayRegistry {
  active_gateway_id?: string | null;
  local?: GatewayEndpoint | null;
  remotes?: GatewayEndpoint[];
  version: number;
}
export interface GatewayAuthTokenWrite {
  label: string;
  token: string;
  token_ref: string;
}

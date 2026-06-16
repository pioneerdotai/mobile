/* eslint-disable */

export type GatewayEndpointKind = 'local' | 'remote';

export interface SetGatewayWorkspaceRegistryPlan {
  endpoint: GatewayEndpoint;
  previous_endpoint: GatewayEndpoint;
  registry: GatewayRegistry;
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

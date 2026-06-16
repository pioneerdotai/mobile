/* eslint-disable */

export type GatewayEndpointKind = 'local' | 'remote';

export interface PlanAddRemoteGatewayRequest {
  address: string;
  auth_token?: string | null;
  default_remote_name: string;
  name: string;
  new_endpoint_id?: string | null;
  registry: GatewayRegistry;
}
export interface GatewayRegistry {
  active_gateway_id?: string | null;
  local?: GatewayEndpoint | null;
  remotes?: GatewayEndpoint[];
  version: number;
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

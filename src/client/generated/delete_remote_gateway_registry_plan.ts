/* eslint-disable */

export type GatewayEndpointKind = 'local' | 'remote';
export type GatewayId = string;

export interface DeleteRemoteGatewayRegistryPlan {
  deleted_active: boolean;
  endpoint: GatewayEndpoint;
  fallback_endpoint?: GatewayEndpoint | null;
  previous_active_gateway_id?: string | null;
  registry: GatewayRegistry;
  [k: string]: unknown;
}
export interface GatewayEndpoint {
  address: string;
  id: string;
  kind: GatewayEndpointKind;
  name: string;
  server_gateway_id?: GatewayId | null;
  service_name?: string | null;
  session_ref?: string | null;
  workspace_id?: string | null;
}
export interface GatewayRegistry {
  active_gateway_id?: string | null;
  installation_id?: string | null;
  local?: GatewayEndpoint | null;
  remotes?: GatewayEndpoint[];
  version: number;
}

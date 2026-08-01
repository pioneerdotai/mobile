/* eslint-disable */

export type GatewayEndpointKind = 'local' | 'remote';
export type GatewayId = string;

export interface PlanActivateGatewayRequest {
  gateway_id: string;
  registry: GatewayRegistry;
}
export interface GatewayRegistry {
  active_gateway_id?: string | null;
  installation_id?: string | null;
  local?: GatewayEndpoint | null;
  remotes?: GatewayEndpoint[];
  version: number;
}
export interface GatewayEndpoint {
  gateway_base_url: string;
  id: string;
  kind: GatewayEndpointKind;
  name: string;
  server_gateway_id?: GatewayId | null;
  service_name?: string | null;
  session_ref?: string | null;
  workspace_id?: string | null;
}

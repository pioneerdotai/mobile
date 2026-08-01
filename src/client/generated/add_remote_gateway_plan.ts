/* eslint-disable */

export type GatewayEndpointKind = 'local' | 'remote';
export type GatewayId = string;

export interface AddRemoteGatewayPlan {
  endpoint: GatewayEndpoint;
  previous_endpoint?: GatewayEndpoint | null;
  [k: string]: unknown;
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

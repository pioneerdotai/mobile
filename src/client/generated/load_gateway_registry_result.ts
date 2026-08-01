/* eslint-disable */

export type LoadGatewayRegistryResult =
  | {
      registry: GatewayRegistry;
      state: 'current';
      [k: string]: unknown;
    }
  | {
      registry: GatewayRegistry;
      state: 'migrated';
      [k: string]: unknown;
    }
  | {
      endpoint_ids: string[];
      state: 'reconfiguration_required';
      [k: string]: unknown;
    };
export type GatewayEndpointKind = 'local' | 'remote';
export type GatewayId = string;

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

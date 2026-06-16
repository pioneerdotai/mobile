/* eslint-disable */

export type GatewayAuthTokenUpdate =
  | {
      mode: 'preserve';
      [k: string]: unknown;
    }
  | {
      mode: 'replace';
      token: string;
      [k: string]: unknown;
    }
  | {
      mode: 'clear';
      [k: string]: unknown;
    };
export type GatewayEndpointKind = 'local' | 'remote';

export interface PlanUpdateRemoteGatewayRequest {
  address: string;
  auth_token_update: GatewayAuthTokenUpdate;
  default_remote_name: string;
  gateway_id: string;
  name: string;
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

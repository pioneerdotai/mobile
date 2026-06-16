/* eslint-disable */

export type GatewayEndpointKind = 'local' | 'remote';

export interface ClientGatewayConnectRequest {
  auth_token?: string | null;
  endpoint: GatewayEndpoint;
  timings: ClientGatewayWsTimings;
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
export interface ClientGatewayWsTimings {
  connect_timeout_ms: number;
  ping_interval_ms: number;
  pong_timeout_ms: number;
  reconnect_initial_ms: number;
  reconnect_jitter_percent: number;
  reconnect_max_ms: number;
}

/* eslint-disable */

export type GatewayEndpointKind = 'local' | 'remote';
export type GatewayId = string;

export interface ClientGatewaySessionEnsureRequest {
  endpoint: GatewayEndpoint;
  installation_id: string;
  rejected_connection_id?: number | null;
  timings: ClientGatewayWsTimings;
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
export interface ClientGatewayWsTimings {
  connect_timeout_ms: number;
  ping_interval_ms: number;
  pong_timeout_ms: number;
  reconnect_initial_ms: number;
  reconnect_jitter_percent: number;
  reconnect_max_ms: number;
}

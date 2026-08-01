/* eslint-disable */

export type DeviceId = string;
export type GatewayEndpointKind = 'local' | 'remote';
export type GatewayId = string;
export type AuthSessionId = string;

export interface ClientGatewaySessionReplaceAccessRequest {
  access_expires_at_unix: number;
  access_token: string;
  device_id: DeviceId;
  endpoint: GatewayEndpoint;
  refresh_leeway_seconds: number;
  server_gateway_id: GatewayId;
  session_id: AuthSessionId;
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

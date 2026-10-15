/* eslint-disable */

export type ClientEffectResult =
  | {
      environment: OnboardingEnvironment;
      kind: 'gateway_environment_loaded';
      [k: string]: unknown;
    }
  | {
      kind: 'local_gateway_prepared';
      prepared: LocalGatewayPreparation;
      [k: string]: unknown;
    }
  | {
      activation: string;
      kind: 'local_device_activation_created';
      [k: string]: unknown;
    }
  | {
      envelope?: GatewaySessionEnvelope | null;
      kind: 'gateway_session_envelope_loaded';
      [k: string]: unknown;
    }
  | {
      kind: 'completed';
      [k: string]: unknown;
    }
  | {
      code: string;
      kind: 'failed';
      [k: string]: unknown;
    };
export type ClientKind = 'desktop' | 'mobile' | 'other';
export type GatewayEndpointKind = 'local' | 'remote';
export type GatewayId = string;
export type DeviceId = string;
export type PrincipalId = string;
export type AuthSessionId = string;
export type TokenFamilyId = string;

export interface ClientEffectCompletionDto {
  completion: ClientEffectCompletion;
  schema_version: number;
}
export interface ClientEffectCompletion {
  generation: number;
  operation_id: string;
  result: ClientEffectResult;
  [k: string]: unknown;
}
export interface OnboardingEnvironment {
  binding_journals?: GatewayBindingJournalRecord[];
  default_remote_name: string;
  discard_unbound_remote_candidates?: boolean;
  installation: ClientInstallationDescriptor;
  local_install_required: boolean;
  local_provisioned: boolean;
  local_update_required: boolean;
  registry: GatewayRegistry;
  remote_connect_timeout_min: Duration;
  timings: GatewayTimings;
  ws_timings: GatewayWsTimings;
  [k: string]: unknown;
}
export interface GatewayBindingJournalRecord {
  document: string;
  gateway_id: string;
  [k: string]: unknown;
}
export interface ClientInstallationDescriptor {
  client_kind: ClientKind;
  client_version?: string | null;
  display_name: string;
  installation_id: string;
  platform?: string | null;
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
export interface Duration {
  nanos: number;
  secs: number;
  [k: string]: unknown;
}
export interface GatewayTimings {
  connect_timeout: Duration;
  poll_interval: Duration;
  startup_timeout: Duration;
  [k: string]: unknown;
}
export interface GatewayWsTimings {
  connect_timeout: Duration;
  ping_interval: Duration;
  pong_timeout: Duration;
  reconnect_initial: Duration;
  reconnect_jitter_percent: number;
  reconnect_max: Duration;
  [k: string]: unknown;
}
export interface LocalGatewayPreparation {
  activation?: string | null;
  endpoint: GatewayEndpoint;
  warnings: string[];
  [k: string]: unknown;
}
export interface GatewaySessionEnvelope {
  device_id: DeviceId;
  gateway_id: GatewayId;
  installation_id: string;
  pending_refresh_request_id?: string | null;
  principal_id: PrincipalId;
  refresh_expires_at_unix: number;
  refresh_generation: number;
  refresh_token: string;
  schema_version: number;
  session_id: AuthSessionId;
  token_family_id: TokenFamilyId;
}

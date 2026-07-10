/* eslint-disable */

export type CLIAgentRuntimeKind = 'codex' | 'claude';
export type GatewayRemoteAccessErrorKind =
  | 'invalid_settings'
  | 'missing_key'
  | 'missing_binary'
  | 'local_gateway_unavailable'
  | 'relay_resolve_failed'
  | 'relay_connect_failed'
  | 'tunnel_auth_failed'
  | 'process_exited'
  | 'unsupported_transport'
  | 'restart_limit_reached'
  | 'io'
  | 'unknown';
export type GatewayThreadEpisodicVectorProvider = 'openai' | 'openrouter' | 'local';

export interface GatewaySettingsState {
  error?: string | null;
  loading: boolean;
  settings?: GatewaySettingsSnapshot | null;
  [k: string]: unknown;
}
export interface GatewaySettingsSnapshot {
  cli_runtimes?: GatewayCliRuntimeSettings;
  general?: GatewayGeneralSettings;
  memory: GatewayMemorySettings;
  remote_access?: GatewayRemoteAccessSettings;
  thread_episodic?: GatewayThreadEpisodicSettings;
  [k: string]: unknown;
}
export interface GatewayCliRuntimeSettings {
  instances?: GatewayCliRuntimeInstanceSettings[];
  [k: string]: unknown;
}
export interface GatewayCliRuntimeInstanceSettings {
  binary_path: string;
  display_name: string;
  enabled: boolean;
  home_path: string;
  id: string;
  kind: CLIAgentRuntimeKind;
  shadow_home_path?: string | null;
  [k: string]: unknown;
}
export interface GatewayGeneralSettings {
  keepawake?: boolean;
  preflight_model?: GatewayMemoryModelSelection;
  [k: string]: unknown;
}
export interface GatewayMemoryModelSelection {
  model?: string | null;
  model_provider?: string | null;
  source?: 'thread' | 'custom';
  [k: string]: unknown;
}
export interface GatewayMemorySettings {
  active_recall_enabled: boolean;
  background_extraction_enabled: boolean;
  debug_trace_enabled: boolean;
  deterministic_recall_enabled: boolean;
  enabled: boolean;
  proactive_writes_enabled: boolean;
  proactive_writes_model?: GatewayMemoryModelSelection1;
  strict_diagnostics_enabled: boolean;
  tools_enabled: boolean;
  [k: string]: unknown;
}
export interface GatewayMemoryModelSelection1 {
  model?: string | null;
  model_provider?: string | null;
  source?: 'thread' | 'custom';
  [k: string]: unknown;
}
export interface GatewayRemoteAccessSettings {
  enabled?: boolean;
  has_key?: boolean;
  server?: string | null;
  service_name?: string | null;
  status?: GatewayRemoteAccessStatusSnapshot;
  transport?: 'tcp' | 'tls' | 'noise' | 'websocket';
  [k: string]: unknown;
}
export interface GatewayRemoteAccessStatusSnapshot {
  error_kind?: GatewayRemoteAccessErrorKind | null;
  message?: string | null;
  state?: 'disabled' | 'starting' | 'connected' | 'reconnecting' | 'failed' | 'stopped';
  updated_at_unix?: number | null;
  [k: string]: unknown;
}
export interface GatewayThreadEpisodicSettings {
  default_max_candidates: number;
  default_prompt_chars: number;
  enabled: boolean;
  index_batch_limit: number;
  indexing_enabled: boolean;
  max_attempts: number;
  max_candidate_work: number;
  max_hit_chars: number;
  max_prompt_chars: number;
  max_segments: number;
  min_relevancy: number;
  min_results: number;
  near_capacity_percent: number;
  recall_enabled: boolean;
  retry_base_delay_secs: number;
  retry_max_delay_secs: number;
  snippet_chars: number;
  vector_search?: GatewayThreadEpisodicVectorSearchSettings;
  [k: string]: unknown;
}
export interface GatewayThreadEpisodicVectorSearchSettings {
  embedding_dimension?: number | null;
  embedding_normalized?: boolean;
  enabled?: boolean;
  local_model?: string | null;
  local_model_status?: 'not_selected' | 'unknown' | 'missing' | 'downloading' | 'installed' | 'failed';
  model?: string | null;
  provider?: GatewayThreadEpisodicVectorProvider | null;
  provider_key?: GatewayThreadEpisodicVectorProviderKeyStatus;
  refill_status?: 'disabled' | 'unknown' | 'required' | 'running' | 'complete' | 'failed';
  use_search_instructions?: boolean;
  [k: string]: unknown;
}
export interface GatewayThreadEpisodicVectorProviderKeyStatus {
  present?: boolean;
  required?: boolean;
  [k: string]: unknown;
}

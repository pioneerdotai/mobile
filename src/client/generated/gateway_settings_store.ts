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
export type SelfImprovementStatusReason =
  | 'disabled'
  | 'model_unavailable'
  | 'worker_unavailable'
  | 'preparing'
  | 'no_new_sources'
  | 'awaiting_schedule'
  | 'analyzing'
  | 'finalizing'
  | 'pending'
  | 'recovering'
  | 'timeout'
  | 'output_limit'
  | 'invalid_response'
  | 'provider_error'
  | 'response_filtered'
  | 'no_candidate'
  | 'reviewer_rejected'
  | 'validation_rejected'
  | 'created'
  | 'updated'
  | 'rolled_back'
  | 'cancelled'
  | 'unknown';
export type SelfImprovementPhase =
  'disabled' | 'unavailable' | 'waiting' | 'running' | 'retrying' | 'failed' | 'no_change' | 'completed' | 'cancelled';
export type GatewayThreadEpisodicVectorProvider = 'openai' | 'openrouter' | 'local';
export type GatewayVoiceInputProvider = 'local';

export interface GatewaySettingsStore {
  error?: string | null;
  loading: boolean;
  saving: boolean;
  settings?: GatewaySettingsSnapshot | null;
  vector_refill_refresh_requested: boolean;
  voice_input?: GatewayVoiceInputSettings1 | null;
  workspace_id?: string | null;
  [k: string]: unknown;
}
export interface GatewaySettingsSnapshot {
  cli_runtimes?: GatewayCliRuntimeSettings;
  general?: GatewayGeneralSettings;
  memory: GatewayMemorySettings;
  remote_access?: GatewayRemoteAccessSettings;
  self_improvement?: GatewaySelfImprovementSettings;
  /**
   * Read-only status of learning in the connection's workspace. Absent on older gateways.
   */
  self_improvement_status?: GatewaySelfImprovementStatus | null;
  thread_episodic?: GatewayThreadEpisodicSettings;
  voice_input?: GatewayVoiceInputSettings;
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
  /**
   * Stable workspace nickname used by the direct AgentIdentity projection.
   * The default keeps old settings files readable; gateway validation owns
   * uniqueness and rejects an empty/duplicate value before activation.
   */
  nickname?: string;
  shadow_home_path?: string | null;
  [k: string]: unknown;
}
export interface GatewayGeneralSettings {
  keepawake?: boolean;
  preflight_model?: GatewayMemoryModelSelection;
  telemetry_enabled?: boolean;
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
/**
 * Effective Self-improvement settings for the workspace bound to this RPC connection.
 */
export interface GatewaySelfImprovementSettings {
  default_model?: GatewaySelfImprovementModelSelection | null;
  enabled?: boolean;
  reviewer_model?: GatewaySelfImprovementModelSelection | null;
}
export interface GatewaySelfImprovementModelSelection {
  model: string;
  provider: string;
  /**
   * None delegates to the provider; `none` explicitly disables reasoning.
   */
  reasoning_effort?: string | null;
}
/**
 * Bounded operational projection; contains no history, prompts, or provider error payloads.
 */
export interface GatewaySelfImprovementStatus {
  last_result?: SelfImprovementStatusReason | null;
  last_run_at_unix?: number | null;
  next_retry_at_unix?: number | null;
  next_scheduled_at_unix?: number | null;
  observed_at_unix: number;
  phase: SelfImprovementPhase;
  progress?: SelfImprovementProgress | null;
  reason: SelfImprovementStatusReason;
  workspace_id: string;
  [k: string]: unknown;
}
export interface SelfImprovementProgress {
  processed_chunks: number;
  total_chunks: number;
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
  downloaded_bytes?: number | null;
  embedding_dimension?: number | null;
  embedding_normalized?: boolean;
  enabled?: boolean;
  local_model?: string | null;
  local_model_status?: 'not_selected' | 'unknown' | 'missing' | 'downloading' | 'installed' | 'failed';
  model?: string | null;
  provider?: GatewayThreadEpisodicVectorProvider | null;
  provider_key?: GatewayThreadEpisodicVectorProviderKeyStatus;
  refill_status?: 'disabled' | 'unknown' | 'required' | 'running' | 'complete' | 'failed';
  total_bytes?: number | null;
  use_search_instructions?: boolean;
  [k: string]: unknown;
}
export interface GatewayThreadEpisodicVectorProviderKeyStatus {
  present?: boolean;
  required?: boolean;
  [k: string]: unknown;
}
export interface GatewayVoiceInputSettings {
  enabled?: boolean;
  model?: string | null;
  provider?: GatewayVoiceInputProvider | null;
  runtime?: GatewayVoiceInputRuntimeSnapshot;
  [k: string]: unknown;
}
export interface GatewayVoiceInputRuntimeSnapshot {
  downloaded_bytes?: number | null;
  effective_enabled?: boolean;
  error?: string | null;
  model?: string | null;
  phase?: 'disabled' | 'model_not_selected' | 'missing' | 'downloading' | 'installing' | 'loading' | 'ready' | 'failed';
  total_bytes?: number | null;
  [k: string]: unknown;
}
export interface GatewayVoiceInputSettings1 {
  enabled?: boolean;
  model?: string | null;
  provider?: GatewayVoiceInputProvider | null;
  runtime?: GatewayVoiceInputRuntimeSnapshot;
  [k: string]: unknown;
}

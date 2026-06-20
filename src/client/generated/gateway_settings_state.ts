/* eslint-disable */

export type CLIAgentRuntimeKind = 'codex' | 'claude';

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
export interface GatewayThreadEpisodicSettings {
  chunk_max_chars: number;
  chunk_target_max_chars: number;
  chunk_target_min_chars: number;
  default_max_candidates: number;
  default_prompt_chars: number;
  enabled: boolean;
  index_batch_limit: number;
  indexing_enabled: boolean;
  max_attempts: number;
  max_candidate_work: number;
  max_chunks_per_item: number;
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
  [k: string]: unknown;
}

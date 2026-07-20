/* eslint-disable */

export type ClientVoiceInputPlanResult =
  | {
      operation: 'settings_action';
      plan: VoiceInputSettingsPlan;
      [k: string]: unknown;
    }
  | {
      operation: 'status_reduction';
      reduction: VoiceInputStatusReduction;
      [k: string]: unknown;
    };
export type VoiceInputSettingsPlan =
  | {
      kind: 'update';
      update: GatewaySettingsUpdate;
      [k: string]: unknown;
    }
  | {
      kind: 'needs_selection';
      [k: string]: unknown;
    }
  | {
      kind: 'noop';
      [k: string]: unknown;
    }
  | {
      kind: 'rejected';
      reason: VoiceInputSettingsPlanRejection;
      [k: string]: unknown;
    };
export type CLIAgentRuntimeKind = 'codex' | 'claude';
export type GatewayThreadEpisodicVectorProvider = 'openai' | 'openrouter' | 'local';
export type GatewayVoiceInputProvider = 'local';
export type VoiceInputSettingsPlanRejection = 'invalid_provider' | 'missing_model' | 'retry_unavailable';
export type GatewayVoiceInputRuntimePhase =
  | 'disabled'
  | 'model_not_selected'
  | 'missing'
  | 'downloading'
  | 'installing'
  | 'loading'
  | 'ready'
  | 'failed';
export type VoiceInputRuntimePresentation = 'disabled' | 'needs_selection' | 'preparing' | 'ready' | 'failed';

export interface GatewaySettingsUpdate {
  cli_runtimes?: GatewayCliRuntimeSettings | null;
  general?: GatewayGeneralSettingsUpdate | null;
  memory?: GatewayMemorySettings | null;
  remote_access?: GatewayRemoteAccessSettingsUpdate | null;
  thread_episodic?: GatewayThreadEpisodicSettingsUpdate | null;
  voice_input?: GatewayVoiceInputSettingsUpdate | null;
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
export interface GatewayGeneralSettingsUpdate {
  keepawake?: boolean | null;
  preflight_model?: GatewayMemoryModelSelection | null;
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
export interface GatewayRemoteAccessSettingsUpdate {
  clear_key?: boolean | null;
  enabled?: boolean | null;
  key?: string | null;
  server?: string | null;
  [k: string]: unknown;
}
export interface GatewayThreadEpisodicSettingsUpdate {
  default_max_candidates?: number | null;
  default_prompt_chars?: number | null;
  enabled?: boolean | null;
  index_batch_limit?: number | null;
  indexing_enabled?: boolean | null;
  max_attempts?: number | null;
  max_candidate_work?: number | null;
  max_hit_chars?: number | null;
  max_prompt_chars?: number | null;
  max_segments?: number | null;
  min_relevancy?: number | null;
  min_results?: number | null;
  near_capacity_percent?: number | null;
  recall_enabled?: boolean | null;
  retry_base_delay_secs?: number | null;
  retry_max_delay_secs?: number | null;
  snippet_chars?: number | null;
  vector_search?: GatewayThreadEpisodicVectorSearchSettingsUpdate | null;
  [k: string]: unknown;
}
export interface GatewayThreadEpisodicVectorSearchSettingsUpdate {
  embedding_normalized?: boolean | null;
  enabled?: boolean | null;
  local_model?: string | null;
  model?: string | null;
  provider?: GatewayThreadEpisodicVectorProvider | null;
  use_search_instructions?: boolean | null;
  [k: string]: unknown;
}
export interface GatewayVoiceInputSettingsUpdate {
  enabled?: boolean | null;
  model?: string | null;
  provider?: GatewayVoiceInputProvider | null;
  retry_install?: boolean;
  [k: string]: unknown;
}
export interface VoiceInputStatusReduction {
  desired_enabled: boolean;
  effective_enabled: boolean;
  model_selected: boolean;
  non_terminal: boolean;
  phase: GatewayVoiceInputRuntimePhase;
  presentation: VoiceInputRuntimePresentation;
  retry_available: boolean;
  show_progress: boolean;
  [k: string]: unknown;
}

/* eslint-disable */

export type CLIRuntimeProviderSettingsPlan =
  | {
      Send: GatewaySettingsUpdatePlan;
    }
  | {
      Reject: CLIRuntimeProviderSettingsRejection;
    };
export type CLIAgentRuntimeKind = 'codex' | 'claude';
export type CLIRuntimeProviderSettingsRejection =
  | ('MissingSettings' | 'EmptyId' | 'ShadowHomeMatchesHome')
  | {
      MissingRuntime: {
        runtime_id: string;
        [k: string]: unknown;
      };
    }
  | {
      InvalidId: {
        id: string;
        message: string;
        [k: string]: unknown;
      };
    }
  | {
      DuplicateId: {
        id: string;
        [k: string]: unknown;
      };
    }
  | {
      DuplicateDisplayName: {
        display_name: string;
        [k: string]: unknown;
      };
    }
  | {
      EmptyPath: {
        field: string;
        [k: string]: unknown;
      };
    }
  | {
      InvalidPath: {
        field: string;
        message: string;
        [k: string]: unknown;
      };
    }
  | {
      UnsupportedKind: {
        kind: CLIAgentRuntimeKind;
        [k: string]: unknown;
      };
    };

export interface GatewaySettingsUpdatePlan {
  snapshot: GatewaySettingsSnapshot;
  update: GatewaySettingsUpdate;
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
export interface GatewaySettingsUpdate {
  cli_runtimes?: GatewayCliRuntimeSettings1 | null;
  general?: GatewayGeneralSettingsUpdate | null;
  memory?: GatewayMemorySettings | null;
  thread_episodic?: GatewayThreadEpisodicSettingsUpdate | null;
  [k: string]: unknown;
}
export interface GatewayCliRuntimeSettings1 {
  instances?: GatewayCliRuntimeInstanceSettings[];
  [k: string]: unknown;
}
export interface GatewayGeneralSettingsUpdate {
  keepawake?: boolean | null;
  preflight_model?: GatewayMemoryModelSelection2 | null;
  [k: string]: unknown;
}
export interface GatewayMemoryModelSelection2 {
  model?: string | null;
  model_provider?: string | null;
  source?: 'thread' | 'custom';
  [k: string]: unknown;
}
export interface GatewayThreadEpisodicSettingsUpdate {
  chunk_max_chars?: number | null;
  chunk_target_max_chars?: number | null;
  chunk_target_min_chars?: number | null;
  default_max_candidates?: number | null;
  default_prompt_chars?: number | null;
  enabled?: boolean | null;
  index_batch_limit?: number | null;
  indexing_enabled?: boolean | null;
  max_attempts?: number | null;
  max_candidate_work?: number | null;
  max_chunks_per_item?: number | null;
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
  [k: string]: unknown;
}

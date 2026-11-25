/* eslint-disable */

export type ComposerCatalogRequestState =
  | {
      kind: 'idle';
      [k: string]: unknown;
    }
  | {
      kind: 'loading';
      [k: string]: unknown;
    }
  | {
      kind: 'ready';
      [k: string]: unknown;
    }
  | {
      kind: 'failed';
      message: string;
      [k: string]: unknown;
    }
  | {
      kind: 'cancelled';
      [k: string]: unknown;
    };
export type ComposerCapabilityTargetKind = 'native' | 'cli';
export type CliRuntimeMcpReadinessReason =
  | 'runtimeNotReady'
  | 'unsupportedContract'
  | 'strictIsolationFailed'
  | 'helperSelfProbeFailed'
  | 'platformIpcUnavailable'
  | 'continuityUnavailable'
  | 'readinessUnavailable';
export type RuntimeDiagnosticLevel = 'info' | 'warning' | 'error';
export type CLIAgentRuntimeKind = 'codex' | 'claude' | 'opencode';
export type RuntimeStatus =
  | {
      state: 'disabled';
      [k: string]: unknown;
    }
  | {
      binary_path?: string | null;
      state: 'missing_binary';
      [k: string]: unknown;
    }
  | {
      message: string;
      state: 'spawn_failed';
      [k: string]: unknown;
    }
  | {
      state: 'initializing';
      [k: string]: unknown;
    }
  | {
      state: 'needs_auth';
      [k: string]: unknown;
    }
  | {
      state: 'ready';
      [k: string]: unknown;
    }
  | {
      message: string;
      state: 'degraded';
      [k: string]: unknown;
    }
  | {
      minimum_version?: string | null;
      state: 'unsupported_version';
      version?: string | null;
      [k: string]: unknown;
    }
  | {
      message: string;
      state: 'error';
      [k: string]: unknown;
    };
export type ProviderModelSelectorMode = ('Chat' | 'SelfImprovement' | 'Embeddings' | 'Transcription') | 'AuxiliaryChat';
export type ReasoningCapabilitySource = 'provider_metadata' | 'cli_metadata' | 'config_override' | 'unknown';
/**
 * Authority-scoped, normalized context choices. Absence on a discovery DTO
 * means unavailable metadata, distinct from a confirmed model without tiers.
 */
export type ProviderContextTiers =
  | {
      status: 'no_tiers';
      [k: string]: unknown;
    }
  | {
      status: 'excluded';
      [k: string]: unknown;
    }
  | {
      status: 'invalid';
      [k: string]: unknown;
    }
  | {
      price_order_confirmed: boolean;
      status: 'tiered';
      windows: number[];
      [k: string]: unknown;
    };
export type SourceServiceModes =
  | {
      status: 'unknown';
      [k: string]: unknown;
    }
  | {
      status: 'malformed';
      [k: string]: unknown;
    }
  | {
      modes: {
        [k: string]: SourceServiceMode;
      };
      status: 'known';
      [k: string]: unknown;
    };
export type SourceServiceMode =
  | {
      descriptor: ServiceModeDescriptor;
      status: 'parsed';
      [k: string]: unknown;
    }
  | {
      status: 'malformed';
      [k: string]: unknown;
    }
  | {
      status: 'unmapped';
      [k: string]: unknown;
    };
export type ServiceModeParameters =
  | {
      kind: 'neutral';
    }
  | {
      kind: 'open_ai_standard';
    }
  | {
      kind: 'anthropic_standard';
    }
  | {
      kind: 'bedrock_standard';
    }
  | {
      kind: 'open_ai_tier';
      tier: OpenAiTier;
    }
  | {
      kind: 'open_ai_pro';
    }
  | {
      beta?: string | null;
      kind: 'anthropic_fast';
    }
  | {
      kind: 'bedrock_nested_ultrafast';
    };
export type OpenAiTier = 'priority' | 'flex' | 'ultrafast';

export interface ComposerModelPickerPublication {
  closed: boolean;
  context_rows?: ContextWindowRow[];
  default_reasoning_only?: boolean;
  deferred: boolean;
  identity: ComposerOperationIdentity;
  models_request: ComposerCatalogRequest;
  provider_rows: ComposerModelPickerProvider[];
  providers_request: ComposerCatalogRequest;
  reasoning_rows: ReasoningEffortRow[];
  revision: number;
  selected_context_authority?: string | null;
  selected_context_window?: number | null;
  selected_provider_ready: boolean;
  selected_reasoning_effort?: string | null;
  selected_service_mode?: NativeServiceModeSelection | null;
  selector: ProviderModelSelectorState;
  service_rows?: ServiceModeRow[];
  [k: string]: unknown;
}
/**
 * Model-scoped context choices. Shells only localize the Auto/up-to labels.
 */
export interface ContextWindowRow {
  selected: boolean;
  tokens: number;
  window?: number | null;
  [k: string]: unknown;
}
export interface ComposerOperationIdentity {
  draft_id: number;
  generation: number;
  thread_id: string;
  [k: string]: unknown;
}
export interface ComposerCatalogRequest {
  generation: number;
  state: ComposerCatalogRequestState;
  [k: string]: unknown;
}
export interface ComposerModelPickerProvider {
  capability_target: ComposerCapabilityTarget;
  cli_runtime: boolean;
  id: string;
  label: string;
  mcp_readiness_reason?: CliRuntimeMcpReadinessReason | null;
  [k: string]: unknown;
}
/**
 * Capability eligibility context.
 *
 * The target kind exists only because native skills retain their current
 * source policy while CLI skills must be exportable. Capability support is
 * represented exclusively by [`ComposerCapabilityPolicy`].
 */
export interface ComposerCapabilityTarget {
  kind: ComposerCapabilityTargetKind;
  supports_mcp_tools: boolean;
  supports_skills: boolean;
}
export interface ReasoningEffortRow {
  effort: string;
  label: string;
  selected: boolean;
}
/**
 * Explicit choice uses the existing endpoint/credential/model authority proof.
 * Absence means Standard; Inherit belongs to the enclosing model selection.
 */
export interface NativeServiceModeSelection {
  authority: string;
  id: string;
}
export interface ProviderModelSelectorState {
  cli_runtimes: RuntimeSummary[];
  error?: string | null;
  loading_cli_runtimes: boolean;
  loading_models: boolean;
  loading_providers: boolean;
  mode: ProviderModelSelectorMode;
  models: ProviderModelInfo[];
  providers: ProviderSummary[];
  selected_model?: string | null;
  selected_provider?: string | null;
  [k: string]: unknown;
}
export interface RuntimeSummary {
  account?: RuntimeAccountSnapshot | null;
  binary_path?: string | null;
  capabilities: RuntimeCapabilities;
  debug_native_events_enabled?: boolean;
  diagnostics?: RuntimeDiagnostic[];
  display_name: string;
  enabled: boolean;
  home_path?: string | null;
  kind: CLIAgentRuntimeKind;
  models_refreshed_at_unix_ms?: number | null;
  proxy_url?: string | null;
  recent_stderr?: string[];
  runtime_id: string;
  shadow_home_path?: string | null;
  status: RuntimeStatus;
  version?: string | null;
  [k: string]: unknown;
}
export interface RuntimeAccountSnapshot {
  account_id?: string | null;
  auth_method?: string | null;
  authenticated: boolean;
  display_name?: string | null;
  email?: string | null;
  plan?: string | null;
  [k: string]: unknown;
}
export interface RuntimeCapabilities {
  supports_approvals: boolean;
  supports_apps: boolean;
  supports_auth_management: boolean;
  supports_command_approvals: boolean;
  supports_compaction: boolean;
  supports_diff_updates: boolean;
  supports_file_change_approvals: boolean;
  supports_fork: boolean;
  supports_generated_schema_probe: boolean;
  supports_goal: boolean;
  supports_history_read: boolean;
  supports_interrupt: boolean;
  supports_mcp_tools?: boolean;
  supports_model_list: boolean;
  supports_resume: boolean;
  supports_review: boolean;
  supports_skills?: boolean;
  supports_steer: boolean;
  supports_thread_archive: boolean;
  supports_threads: boolean;
  supports_user_input_requests: boolean;
  [k: string]: unknown;
}
export interface RuntimeDiagnostic {
  code: string;
  level: RuntimeDiagnosticLevel;
  message: string;
  [k: string]: unknown;
}
export interface ProviderModelInfo {
  active?: boolean | null;
  capabilities: ProviderModelCapabilities;
  context_authority?: string | null;
  context_tiers?: ProviderContextTiers | null;
  created?: number | null;
  description?: string | null;
  family?: string | null;
  id: string;
  lifecycle_status?: string | null;
  limits: ProviderModelLimits;
  name?: string | null;
  owned_by?: string | null;
  pricing?: ProviderModelPricing | null;
  provider: string;
  service_modes?: SourceServiceModes | null;
  transcription?: ProviderTranscriptionModelMetadata | null;
  [k: string]: unknown;
}
export interface ProviderModelCapabilities {
  embeddings?: boolean | null;
  fine_tuning?: boolean | null;
  input_modalities?: string[] | null;
  json_output?: boolean | null;
  output_modalities?: string[] | null;
  reasoning?: ProviderModelReasoningCapabilities | null;
  streaming?: boolean | null;
  thinking?: boolean | null;
  tool_calling?: boolean | null;
  transcription?: boolean | null;
  vision?: boolean | null;
  [k: string]: unknown;
}
export interface ProviderModelReasoningCapabilities {
  default_effort?: string | null;
  effort_options?: string[];
  mandatory?: boolean | null;
  source?: ReasoningCapabilitySource | null;
  supported?: boolean | null;
  supports_token_budget?: boolean | null;
  [k: string]: unknown;
}
export interface ProviderModelLimits {
  context_window?: number | null;
  max_input_tokens?: number | null;
  max_output_tokens?: number | null;
  [k: string]: unknown;
}
export interface ProviderModelPricing {
  image?: number | null;
  input_token?: number | null;
  output_token?: number | null;
  request?: number | null;
  [k: string]: unknown;
}
/**
 * Retains conditional/partial source prices without flattening context bands
 * or treating absent prices as Standard. Pricing must prove applicability
 * before passing these rates to the existing estimator.
 */
export interface ServiceModeDescriptor {
  cost?: unknown;
  id: string;
  label: string;
  parameters: ServiceModeParameters;
  source_api: string;
  source_model: string;
  source_provider: string;
  source_url?: string | null;
  [k: string]: unknown;
}
export interface ProviderTranscriptionModelMetadata {
  accuracy_score: number;
  download_size_mb: number;
  engine: string;
  recommended: boolean;
  speed_score: number;
  supported_languages: string[];
  supports_language_selection: boolean;
  supports_translation: boolean;
  [k: string]: unknown;
}
export interface ProviderSummary {
  api_key_configured?: boolean;
  /**
   * The gateway can construct this provider in the selected workspace.
   */
  available?: boolean | null;
  base_url?: string | null;
  capabilities?: ProviderSummaryCapabilities;
  name: string;
  proxy_url?: string | null;
  [k: string]: unknown;
}
export interface ProviderSummaryCapabilities {
  embeddings?: boolean;
  /**
   * Gateway-authoritative eligibility for the API-only self-improvement
   * model selectors.
   */
  self_improvement?: boolean;
  transcription?: boolean;
  [k: string]: unknown;
}
/**
 * Shell-neutral rows; prices remain evidence rather than invented flat amounts.
 */
export interface ServiceModeRow {
  available: boolean;
  id: string;
  label: string;
  selected: boolean;
  [k: string]: unknown;
}

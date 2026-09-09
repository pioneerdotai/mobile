/* eslint-disable */

export type ProviderCollection =
  | {
      kind: 'catalog';
      [k: string]: unknown;
    }
  | {
      kind: 'models';
      provider: string;
      purpose: ProviderModelKind;
      [k: string]: unknown;
    };
export type ProviderModelKind = 'chat' | 'embeddings' | 'transcription';
export type ReasoningCapabilitySource =
  'provider_metadata' | 'cli_metadata' | 'static_registry' | 'config_override' | 'unknown';
export type ProviderLoadState = 'idle' | 'loading' | 'ready' | 'failed' | 'forbidden' | 'cancelled';

export interface ProviderCollectionPublication {
  key: ProviderCollectionKey;
  models: ProviderModelRow[];
  providers: ProviderCatalogRow[];
  request: ProviderLoadState;
  revision: number;
  [k: string]: unknown;
}
export interface ProviderCollectionKey {
  collection: ProviderCollection;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ProviderModelRow {
  id: string;
  model: ProviderModelInfo;
  revision: number;
  [k: string]: unknown;
}
export interface ProviderModelInfo {
  active?: boolean | null;
  capabilities: ProviderModelCapabilities;
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
export interface ProviderCatalogRow {
  id: string;
  provider: ProviderSummary;
  revision: number;
  [k: string]: unknown;
}
export interface ProviderSummary {
  api_key_configured?: boolean;
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

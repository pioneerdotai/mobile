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
export type ReasoningCapabilitySource = 'provider_metadata' | 'cli_metadata' | 'config_override' | 'unknown';
/**
 * Authority-scoped, normalized context choices. Absence on a discovery DTO means unavailable metadata, distinct from a confirmed model without tiers.
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
      status: 'tiered';
      windows: number[];
      price_order_confirmed: boolean;
      [k: string]: unknown;
    };
export type ProviderLoadState = 'idle' | 'loading' | 'ready' | 'failed' | 'forbidden' | 'cancelled';

export interface ProviderCollectionPublication {
  definitions: ProviderDefinition[];
  failure?: string | null;
  key: ProviderCollectionKey;
  models: ProviderModelRow[];
  providers: ProviderCatalogRow[];
  request: ProviderLoadState;
  revision: number;
  [k: string]: unknown;
}
export interface ProviderDefinition {
  default_base_url?: string | null;
  name: string;
  /**
   * Terminal product lifecycle diagnostic; old clients can ignore it.
   */
  retirement_reason?: string | null;
  supports_base_url_override?: boolean;
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
  transcription?: ProviderTranscriptionModelMetadata | null;
  service_modes?:
    | null
    | (
        | {
            status: 'unknown';
            [k: string]: unknown;
          }
        | {
            status: 'malformed';
            [k: string]: unknown;
          }
        | {
            status: 'known';
            modes: {
              [k: string]:
                | {
                    status: 'malformed';
                    [k: string]: unknown;
                  }
                | {
                    status: 'unmapped';
                    [k: string]: unknown;
                  }
                | {
                    status: 'parsed';
                    descriptor: {
                      id: string;
                      label: string;
                      parameters:
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
                            kind: 'open_ai_pro';
                          }
                        | {
                            kind: 'bedrock_nested_ultrafast';
                          }
                        | {
                            kind: 'open_ai_tier';
                            tier: 'priority' | 'flex' | 'ultrafast';
                          }
                        | {
                            kind: 'anthropic_fast';
                            beta?: string | null;
                          };
                      source_provider: string;
                      source_model: string;
                      source_api: string;
                      source_url?: string | null;
                      cost?: unknown;
                      [k: string]: unknown;
                    };
                    [k: string]: unknown;
                  };
            };
            [k: string]: unknown;
          }
      );
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

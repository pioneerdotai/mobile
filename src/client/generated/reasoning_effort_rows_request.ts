/* eslint-disable */

export type ReasoningCapabilitySource =
  | 'provider_metadata'
  | 'cli_metadata'
  | 'static_registry'
  | 'config_override'
  | 'unknown';

export interface ReasoningEffortRowsRequest {
  model: ProviderModelInfo;
  selected_effort?: string | null;
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
  [k: string]: unknown;
}
export interface ProviderModelCapabilities {
  fine_tuning?: boolean | null;
  input_modalities?: string[] | null;
  json_output?: boolean | null;
  output_modalities?: string[] | null;
  reasoning?: ProviderModelReasoningCapabilities | null;
  streaming?: boolean | null;
  thinking?: boolean | null;
  tool_calling?: boolean | null;
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

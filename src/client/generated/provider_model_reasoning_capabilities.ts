/* eslint-disable */

export type ReasoningCapabilitySource =
  | 'provider_metadata'
  | 'cli_metadata'
  | 'static_registry'
  | 'config_override'
  | 'unknown';

export interface ProviderModelReasoningCapabilities {
  default_effort?: string | null;
  effort_options?: string[];
  mandatory?: boolean | null;
  source?: ReasoningCapabilitySource | null;
  supported?: boolean | null;
  supports_token_budget?: boolean | null;
  [k: string]: unknown;
}

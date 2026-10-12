/* eslint-disable */

export interface ProviderListResponse {
  /**
   * Gateway-owned endpoint definitions, including providers without credentials.
   */
  definitions?: ProviderDefinition[];
  providers: ProviderSummary[];
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

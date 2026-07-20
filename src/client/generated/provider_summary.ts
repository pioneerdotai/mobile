/* eslint-disable */

export interface ProviderSummary {
  api_key_configured?: boolean;
  capabilities?: ProviderSummaryCapabilities;
  name: string;
  proxy_url?: string | null;
  [k: string]: unknown;
}
export interface ProviderSummaryCapabilities {
  embeddings?: boolean;
  transcription?: boolean;
  [k: string]: unknown;
}

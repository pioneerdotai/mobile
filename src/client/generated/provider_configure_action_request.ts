/* eslint-disable */

export interface ProviderApiKeyActionRequest {
  canonical_provider_id: string;
  connection_id: number;
  params: ProviderConfigureParams;
  [k: string]: unknown;
}
export interface ProviderConfigureParams {
  api_key?: string | null;
  clear_proxy?: boolean;
  provider: string;
  proxy_url?: string | null;
  workspace_id: string;
  [k: string]: unknown;
}

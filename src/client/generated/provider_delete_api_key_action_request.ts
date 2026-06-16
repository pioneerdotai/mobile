/* eslint-disable */

export interface ProviderApiKeyActionRequest {
  canonical_provider_id: string;
  connection_id: number;
  params: ProviderDeleteApiKeyParams;
  [k: string]: unknown;
}
export interface ProviderDeleteApiKeyParams {
  provider: string;
  workspace_id: string;
  [k: string]: unknown;
}

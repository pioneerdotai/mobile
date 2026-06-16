/* eslint-disable */

export type ProviderSetApiKeyPlan =
  | {
      Send: ProviderApiKeyActionRequest;
    }
  | {
      Unavailable: ProviderApiKeyActionUnavailable;
    };
export type ProviderApiKeyActionUnavailable = 'GatewayNotConnected' | 'WorkspaceNotSelected';

export interface ProviderApiKeyActionRequest {
  canonical_provider_id: string;
  connection_id: number;
  params: ProviderSetApiKeyParams;
  [k: string]: unknown;
}
export interface ProviderSetApiKeyParams {
  api_key: string;
  provider: string;
  workspace_id: string;
  [k: string]: unknown;
}

/* eslint-disable */

export interface ProviderConfigureParams {
  api_key?: string | null;
  clear_proxy?: boolean;
  provider: string;
  proxy_url?: string | null;
  workspace_id: string;
  [k: string]: unknown;
}

/* eslint-disable */

export interface ProviderConfigureResponse {
  api_key_updated?: boolean;
  provider: string;
  proxy_deleted?: boolean;
  proxy_updated?: boolean;
  proxy_url?: string | null;
  [k: string]: unknown;
}

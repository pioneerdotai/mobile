/* eslint-disable */

export interface ProviderConfigureResponse {
  api_key_updated?: boolean;
  base_url?: string | null;
  base_url_deleted?: boolean;
  base_url_updated?: boolean;
  provider: string;
  proxy_deleted?: boolean;
  proxy_updated?: boolean;
  proxy_url?: string | null;
  [k: string]: unknown;
}

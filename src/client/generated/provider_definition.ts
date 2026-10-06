/* eslint-disable */

export interface ProviderDefinition {
  default_base_url?: string | null;
  name: string;
  supports_base_url_override?: boolean;
  [k: string]: unknown;
}

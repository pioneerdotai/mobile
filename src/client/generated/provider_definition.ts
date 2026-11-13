/* eslint-disable */

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

/* eslint-disable */

export interface ProviderListResponse {
  providers: ProviderSummary[];
  [k: string]: unknown;
}
export interface ProviderSummary {
  name: string;
  [k: string]: unknown;
}

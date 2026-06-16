/* eslint-disable */

export interface ProviderListRefreshRequest {
  connection_id: number;
  params: ProviderListParams;
  [k: string]: unknown;
}
export interface ProviderListParams {
  workspace_id: string;
  [k: string]: unknown;
}

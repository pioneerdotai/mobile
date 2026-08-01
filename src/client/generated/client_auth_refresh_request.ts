/* eslint-disable */

export interface ClientAuthRefreshRequest {
  credential: string;
  gateway_base_url: string;
  params: AuthRefreshParams;
  timeout_ms?: number;
}
export interface AuthRefreshParams {
  client_version?: string | null;
  refresh_request_id: string;
}

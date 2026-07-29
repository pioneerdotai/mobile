/* eslint-disable */

export interface ClientAuthRefreshRequest {
  address: string;
  credential: string;
  params: AuthRefreshParams;
  timeout_ms?: number;
}
export interface AuthRefreshParams {
  client_version?: string | null;
  refresh_request_id: string;
}

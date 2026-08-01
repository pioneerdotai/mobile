/* eslint-disable */

export type AuthSessionId = string;

export interface ClientAuthSessionCleanupRequest {
  access_token: string;
  gateway_base_url: string;
  session_id: AuthSessionId;
  timeout_ms?: number;
}

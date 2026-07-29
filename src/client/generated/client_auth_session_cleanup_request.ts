/* eslint-disable */

export type AuthSessionId = string;

export interface ClientAuthSessionCleanupRequest {
  access_token: string;
  address: string;
  session_id: AuthSessionId;
  timeout_ms?: number;
}

/* eslint-disable */

export type AuthSessionId = string;

export interface AuthLogoutResponse {
  revoked: boolean;
  session_id: AuthSessionId;
  [k: string]: unknown;
}

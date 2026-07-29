/* eslint-disable */

export type AuthSessionId = string;

export interface AuthSessionRevokeResponse {
  revoked: boolean;
  session_id: AuthSessionId;
  [k: string]: unknown;
}

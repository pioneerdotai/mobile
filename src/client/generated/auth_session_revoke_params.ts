/* eslint-disable */

export type AuthSessionStatus = 'pending' | 'active' | 'revoked' | 'expired';
export type AuthSessionId = string;

export interface AuthSessionRevokeParams {
  expected_status?: AuthSessionStatus | null;
  session_id: AuthSessionId;
}

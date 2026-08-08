/* eslint-disable */

export type SessionTerminalReason =
  | 'authentication_required'
  | 'session_revoked'
  | 'session_expired'
  | 'session_compromised'
  | 'principal_suspended'
  | 'principal_removed'
  | 'gateway_identity_mismatch'
  | 'secure_storage_failed'
  | 'refresh_outcome_unknown'
  | 'refresh_credential_invalid';

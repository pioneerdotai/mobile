/* eslint-disable */

export type ClientInvitationCommitState =
  'refresh_ready' | 'awaiting_secure_storage' | 'awaiting_registry' | 'durable_session_unbound' | 'ready_to_connect';

export interface ClientInvitationAcceptResult {
  commit_id: string;
  state: ClientInvitationCommitState;
  [k: string]: unknown;
}

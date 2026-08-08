/* eslint-disable */

export type InvitationId = string;
/**
 * Shell-neutral invitation state. `Unknown` keeps newer server values
 * fail-closed in an older presentation layer.
 */
export type InvitationPresentationStatus = 'pending' | 'accepted' | 'revoked' | 'expired' | 'unknown';

export interface InvitationListRow {
  can_revoke: boolean;
  created_at_unix: number;
  expires_at_unix: number;
  invitation_id: InvitationId;
  inviter_display_name: string;
  status: InvitationPresentationStatus;
  terminal_at_unix?: number | null;
  workspace_names: string[];
}

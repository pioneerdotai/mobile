/* eslint-disable */

export type PrincipalId = string;
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface InvitationListParams {
  creator_principal_id?: PrincipalId | null;
  cursor?: string | null;
  limit?: number | null;
  status?: InvitationStatus | null;
}

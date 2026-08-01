/* eslint-disable */

export type InvitationId = string;

export interface InvitationChangedNotification {
  invitation_id: InvitationId;
  revision: number;
  [k: string]: unknown;
}

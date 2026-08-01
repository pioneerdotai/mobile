/* eslint-disable */

export type PrincipalId = string;

export interface MemberChangedNotification {
  principal_id: PrincipalId;
  revision: number;
  [k: string]: unknown;
}

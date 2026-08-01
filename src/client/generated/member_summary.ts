/* eslint-disable */

export type PrincipalKind = 'superuser' | 'user';
export type PrincipalId = string;
export type RoleKey = string;
export type PrincipalStatus = 'active' | 'suspended' | 'removed';

export interface MemberSummary {
  avatar_revision?: string | null;
  display_name: string;
  kind: PrincipalKind;
  nickname: string;
  principal_id: PrincipalId;
  role_key?: RoleKey | null;
  status: PrincipalStatus;
  [k: string]: unknown;
}

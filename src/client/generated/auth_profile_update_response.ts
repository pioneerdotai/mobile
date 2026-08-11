/* eslint-disable */

export type PrincipalId = string;
export type PrincipalKind = 'superuser' | 'user';

export interface AuthProfileUpdateResponse {
  changed: boolean;
  principal: AuthPrincipalSnapshot;
  [k: string]: unknown;
}
export interface AuthPrincipalSnapshot {
  avatar_revision?: string | null;
  display_name: string;
  id: PrincipalId;
  kind: PrincipalKind;
  nickname: string;
  [k: string]: unknown;
}

/* eslint-disable */

export type PrincipalKind = 'superuser' | 'user';
export type PrincipalId = string;
export type RoleKey = string;
export type MemberPresentationStatus = 'active' | 'suspended' | 'removed' | 'unknown';

export interface MemberListRow {
  actions: MemberPresentationActions;
  /**
   * Revision-addressed key for the authenticated HTTP avatar cache.
   */
  avatar_revision?: string | null;
  display_name: string;
  kind: PrincipalKind;
  lifecycle_managed: boolean;
  nickname: string;
  principal_id: PrincipalId;
  role: AuthorizationRolePresentation;
  role_key?: RoleKey | null;
  status: MemberPresentationStatus;
}
export interface MemberPresentationActions {
  can_add_to_workspace: boolean;
  can_create_recovery_device: boolean;
  can_remove: boolean;
  can_remove_from_workspace: boolean;
  can_restore: boolean;
  can_suspend: boolean;
}
/**
 * Server-owned presentation metadata for the authenticated role. The key is
 * deliberately open-ended: clients display this object but never derive
 * authorization decisions from it.
 */
export interface AuthorizationRolePresentation {
  built_in: boolean;
  description: string;
  display_name: string;
  key: string;
}

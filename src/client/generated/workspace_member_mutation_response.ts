/* eslint-disable */

export type PrincipalKind = 'superuser' | 'user';
export type PrincipalId = string;
export type RoleKey = string;
export type PrincipalStatus = 'active' | 'suspended' | 'removed';
export type WorkspaceId = string;

export interface WorkspaceMemberMutationResponse {
  changed: boolean;
  member: MemberSummary;
  workspace_id: WorkspaceId;
  [k: string]: unknown;
}
export interface MemberSummary {
  avatar_revision?: string | null;
  display_name: string;
  kind: PrincipalKind;
  /**
   * Server-owned target trait. Clients may combine it with caller
   * capabilities for presentation, but never infer it from identity kind
   * or a well-known role key.
   */
  lifecycle_managed: boolean;
  nickname: string;
  principal_id: PrincipalId;
  role: AuthorizationRolePresentation;
  role_key?: RoleKey | null;
  status: PrincipalStatus;
  [k: string]: unknown;
}
/**
 * Server-owned role label. Clients display it verbatim and never infer
 * role semantics from `kind` or a well-known key.
 */
export interface AuthorizationRolePresentation {
  built_in: boolean;
  description: string;
  display_name: string;
  key: string;
}

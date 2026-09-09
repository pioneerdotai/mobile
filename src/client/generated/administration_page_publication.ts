/* eslint-disable */

export type InvitationId = string;
export type PrincipalKind = 'superuser' | 'user';
export type PrincipalId = string;
export type InvitationRevokeReason =
  'inviter_revoked' | 'inviter_unavailable' | 'grant_authority_lost' | 'workspace_unavailable';
export type RoleKey = string;
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
export type WorkspaceId = string;
/**
 * Shell-neutral invitation state. `Unknown` keeps newer server values
 * fail-closed in an older presentation layer.
 */
export type InvitationPresentationStatus = 'pending' | 'accepted' | 'revoked' | 'expired' | 'unknown';
export type PrincipalStatus = 'active' | 'suspended' | 'removed';
export type MemberPresentationStatus = 'active' | 'suspended' | 'removed' | 'unknown';
export type AdministrationPage =
  | {
      kind: 'members';
      [k: string]: unknown;
    }
  | {
      kind: 'member_directory';
      [k: string]: unknown;
    }
  | {
      kind: 'invitations';
      [k: string]: unknown;
    }
  | {
      kind: 'workspace_members';
      workspace_id: WorkspaceId;
      [k: string]: unknown;
    };
export type AdministrationLoadState =
  | {
      kind: 'idle';
      [k: string]: unknown;
    }
  | {
      kind: 'loading';
      [k: string]: unknown;
    }
  | {
      kind: 'ready';
      [k: string]: unknown;
    }
  | {
      kind: 'failed';
      [k: string]: unknown;
    }
  | {
      kind: 'forbidden';
      [k: string]: unknown;
    }
  | {
      kind: 'cancelled';
      [k: string]: unknown;
    };

export interface AdministrationPagePublication {
  invitations: AdministrationInvitationRow[];
  members: AdministrationMemberRow[];
  next_cursor?: string | null;
  page: AdministrationPage;
  request: AdministrationLoadState;
  request_cursor?: string | null;
  revision: number;
  [k: string]: unknown;
}
export interface AdministrationInvitationRow {
  id: InvitationId;
  invitation: InvitationSummary;
  presentation: InvitationListRow;
  revision: number;
  [k: string]: unknown;
}
export interface InvitationSummary {
  created_at_unix: number;
  expires_at_unix: number;
  invitation_id: InvitationId;
  inviter: InvitationInviterSummary;
  revoke_reason?: InvitationRevokeReason | null;
  role_key: RoleKey;
  status: InvitationStatus;
  terminal_at_unix?: number | null;
  workspaces: InvitationWorkspaceSummary[];
  [k: string]: unknown;
}
export interface InvitationInviterSummary {
  display_name: string;
  kind: PrincipalKind;
  nickname: string;
  principal_id: PrincipalId;
  [k: string]: unknown;
}
export interface InvitationWorkspaceSummary {
  name: string;
  workspace_id: WorkspaceId;
  [k: string]: unknown;
}
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
export interface AdministrationMemberRow {
  id: PrincipalId;
  member: MemberSummary;
  presentation: MemberListRow;
  revision: number;
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
  role: AuthorizationRolePresentation1;
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
export interface AuthorizationRolePresentation1 {
  built_in: boolean;
  description: string;
  display_name: string;
  key: string;
}

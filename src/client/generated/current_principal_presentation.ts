/* eslint-disable */

/**
 * Stable UI vocabulary for the authenticated principal kind. `Unknown` keeps
 * clients fail-closed when a future protocol kind reaches a newer boundary.
 */
export type CurrentPrincipalKindPresentation = 'superuser' | 'member' | 'unknown';
export type PrincipalId = string;

export interface CurrentPrincipalPresentation {
  avatar_revision?: string | null;
  capabilities: PrincipalPresentationCapabilities;
  display_name: string;
  kind: CurrentPrincipalKindPresentation;
  nickname: string;
  principal_id: PrincipalId;
  read_only: boolean;
}
/**
 * Global, shell-neutral discoverability derived from the authenticated
 * principal snapshot.
 *
 * These flags are presentation hints only. The Gateway remains authoritative
 * for every operation and callers must still handle an authoritative denial.
 */
export interface PrincipalPresentationCapabilities {
  can_add_workspace_member: boolean;
  can_create_invitation: boolean;
  can_manage_member_lifecycle: boolean;
  can_manage_own_sessions: boolean;
  can_remove_workspace_member: boolean;
  can_view_invitations: boolean;
  can_view_member_directory: boolean;
}

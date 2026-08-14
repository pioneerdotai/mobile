/* eslint-disable */

export type PrincipalId = string;

export interface CurrentPrincipalPresentation {
  avatar_revision?: string | null;
  capabilities: PrincipalPresentationCapabilities;
  display_name: string;
  nickname: string;
  principal_id: PrincipalId;
  read_only: boolean;
  role: AuthorizationRolePresentation;
}
/**
 * Shell-neutral projection of the Gateway capability snapshot.
 *
 * These flags are presentation hints only. The Gateway remains authoritative
 * for every operation and callers must still handle an authoritative denial.
 */
export interface PrincipalPresentationCapabilities {
  can_acknowledge_own_notifications: boolean;
  can_add_workspace_member: boolean;
  can_create_invitation: boolean;
  can_create_workspace: boolean;
  can_manage_all_threads: boolean;
  can_manage_capabilities: boolean;
  can_manage_gateway_settings: boolean;
  can_manage_member_lifecycle: boolean;
  can_manage_own_sessions: boolean;
  can_manage_workspace: boolean;
  can_read_own_notifications: boolean;
  can_remove_workspace_member: boolean;
  can_run_tasks: boolean;
  can_use_cli_runtimes: boolean;
  can_use_mcp: boolean;
  can_use_providers: boolean;
  can_use_skills: boolean;
  can_view_invitations: boolean;
  can_view_member_directory: boolean;
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

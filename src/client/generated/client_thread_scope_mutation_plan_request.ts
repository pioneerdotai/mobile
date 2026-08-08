/* eslint-disable */

export type ThreadScopeAction =
  | {
      kind: 'list_participants';
      [k: string]: unknown;
    }
  | {
      kind: 'add_participant';
      principal_id: PrincipalId;
      [k: string]: unknown;
    }
  | {
      kind: 'remove_participant';
      principal_id: PrincipalId;
      [k: string]: unknown;
    }
  | {
      kind: 'update_visibility';
      visibility: ThreadVisibility;
      [k: string]: unknown;
    };
export type PrincipalId = string;
/**
 * User-selectable visibility for ordinary user threads.
 *
 * Internal task/system threads deliberately have no public selectable value.
 */
export type ThreadVisibility = 'private' | 'workspace';
export type WorkspaceId = string;

export interface ClientThreadScopeMutationPlanRequest {
  action: ThreadScopeAction;
  thread_id: string;
  workspace_id: WorkspaceId;
}

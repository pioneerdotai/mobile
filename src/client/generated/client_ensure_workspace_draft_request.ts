/* eslint-disable */

/**
 * User-selectable visibility for ordinary user threads.
 *
 * Internal task/system threads deliberately have no public selectable value.
 */
export type ThreadVisibility = 'private' | 'workspace';

export interface ClientEnsureWorkspaceDraftRequest {
  expanded_keys?: string[];
  visibility?: ThreadVisibility | null;
  workspace_id: string;
}

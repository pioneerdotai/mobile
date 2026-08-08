/* eslint-disable */

/**
 * User-selectable visibility for ordinary user threads.
 *
 * Internal task/system threads deliberately have no public selectable value.
 */
export type ThreadVisibility = 'private' | 'workspace';

export interface ThreadUpdateParams {
  archived?: boolean | null;
  name?: string | null;
  thread_id: string;
  visibility?: ThreadVisibility | null;
  workspace_id: string;
  [k: string]: unknown;
}

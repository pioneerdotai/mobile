/* eslint-disable */

/**
 * User-selectable visibility for ordinary user threads.
 *
 * Internal task/system threads deliberately have no public selectable value.
 */
export type ThreadVisibility = 'private' | 'workspace';

export interface ThreadCreateVisibilityPlan {
  default_visibility?: ThreadVisibility | null;
  options: ThreadVisibility[];
}

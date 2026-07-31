/* eslint-disable */

/**
 * Payload-safe reason for invalidating client authorization-derived state.
 *
 * This vocabulary deliberately contains no protected resource metadata or
 * policy-engine details.
 */
export type AccessChangeKind =
  | 'workspace_membership'
  | 'thread_created'
  | 'thread_visibility'
  | 'thread_participant_added'
  | 'thread_participant_removed';

/**
 * Payload-safe bridge projection of the shared Rust access-change plan.
 *
 * This lifecycle DTO omits thread identifiers and protected cache keys.
 * First-party shells may pair it with the minimal `AccessChangedNotification`
 * to evict an exact thread cache after access has been lost.
 */
export interface ClientAccessChangedLifecycle {
  active_scope_cleared: boolean;
  active_thread_cleared: boolean;
  applied: boolean;
  authorization_revision: number;
  change: AccessChangeKind;
  refresh_workspace_catalog: boolean;
  workspace_id: string;
  [k: string]: unknown;
}

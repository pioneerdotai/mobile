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
export type ClientEffect =
  | (
      | 'RefreshWorkspaceList'
      | 'RefreshGatewaySettings'
      | 'RefreshProviderLists'
      | 'QueueSkillsRefresh'
      | 'EnqueueInFlightTurnsForResume'
    )
  | {
      UnsubscribeThreads: {
        thread_ids: string[];
        [k: string]: unknown;
      };
    };

export interface AccessChangedPlan {
  apply: boolean;
  authorization_revision: number;
  change: AccessChangeKind;
  clear_active_thread: boolean;
  clear_active_workspace: boolean;
  clear_workspace_capability_projections: boolean;
  effects: ClientEffect[];
  invalidate_thread_ids: string[];
  workspace_id: string;
  [k: string]: unknown;
}

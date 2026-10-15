/* eslint-disable */

export type ActiveThreadPhaseSnapshot =
  'Idle' | 'Starting' | 'Running' | 'Cancelling' | 'Completing' | 'Completed' | 'Failed' | 'Blocked' | 'Cancelled';

export interface ActiveThreadSnapshot {
  history_loaded: boolean;
  history_loading: boolean;
  in_flight_turn_id?: string | null;
  is_draft: boolean;
  phase: ActiveThreadPhaseSnapshot;
  thread_id?: string | null;
  workspace_id?: string | null;
  [k: string]: unknown;
}

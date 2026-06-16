/* eslint-disable */

export type ActiveThreadPhaseSnapshot =
  | 'Idle'
  | 'Starting'
  | 'Running'
  | 'Cancelling'
  | 'Completing'
  | 'Completed'
  | 'Failed'
  | 'Blocked'
  | 'Cancelled';
export type ActiveThreadStatusSnapshot =
  | (
      | 'GatewayDisconnected'
      | 'StartingThread'
      | 'FinishingTurn'
      | 'PreviousTurnFailed'
      | 'TurnCancelled'
      | 'TurnCompleted'
      | 'Ready'
      | 'StartingTurn'
      | 'AgentProcessing'
    )
  | {
      TurnRunning: {
        turn_id: string;
        [k: string]: unknown;
      };
    };

export interface ClientSnapshot {
  active_thread: ActiveThreadSnapshot;
  has_any_in_flight_turn: boolean;
  has_in_flight_thread_start: boolean;
  threads: ThreadListSnapshot;
  workspace: WorkspaceSnapshot;
  [k: string]: unknown;
}
export interface ActiveThreadSnapshot {
  history_loaded: boolean;
  history_loading: boolean;
  in_flight_turn_id?: string | null;
  is_draft: boolean;
  phase: ActiveThreadPhaseSnapshot;
  status: ActiveThreadStatusSnapshot;
  thread_id?: string | null;
  workspace_id?: string | null;
  [k: string]: unknown;
}
export interface ThreadListSnapshot {
  active_thread_id?: string | null;
  active_workspace_thread_ids: string[];
  draft_thread_id?: string | null;
  has_known_threads_for_active_workspace: boolean;
  loading: boolean;
  [k: string]: unknown;
}
export interface WorkspaceSnapshot {
  action_in_progress: boolean;
  active_workspace_id?: string | null;
  error?: string | null;
  loading: boolean;
  preferred_workspace_id?: string | null;
  workspace_count: number;
  [k: string]: unknown;
}

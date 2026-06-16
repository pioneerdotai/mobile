/* eslint-disable */

export interface ThreadListSnapshot {
  active_thread_id?: string | null;
  active_workspace_thread_ids: string[];
  draft_thread_id?: string | null;
  has_known_threads_for_active_workspace: boolean;
  loading: boolean;
  [k: string]: unknown;
}

/* eslint-disable */

export interface ThreadTreeRefreshRequest {
  active_thread_id?: string | null;
  existing_draft_thread_id?: string | null;
  existing_draft_thread_workspace_id?: string | null;
  has_known_threads_for_workspace?: boolean;
  workspace_id: string;
}

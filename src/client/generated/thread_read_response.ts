/* eslint-disable */

export interface ThreadReadResponse {
  cursor: ThreadReadCursor;
  thread_id: string;
  unread_count: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ThreadReadCursor {
  sort_key: string;
  through_turn_id: string;
  [k: string]: unknown;
}

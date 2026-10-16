/* eslint-disable */

export interface ThreadReadParams {
  thread_id: string;
  /**
   * Exact canonical message viewed by the client. Omission retains the
   * legacy user-message-only Turn anchor.
   */
  through_block?: ThreadReadPosition | null;
  through_turn_id: string;
  [k: string]: unknown;
}
export interface ThreadReadPosition {
  block_id: string;
  sort_key: string;
  [k: string]: unknown;
}

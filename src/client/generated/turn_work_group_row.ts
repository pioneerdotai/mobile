/* eslint-disable */

export type TurnWorkState =
  'starting' | 'running' | 'waiting_for_approval' | 'stalled' | 'completed' | 'blocked' | 'failed' | 'interrupted';

export interface TurnWorkGroupRow {
  anchor_entry_id: string;
  elapsed_ms?: number | null;
  is_open: boolean;
  /**
   * Server-owned lifecycle state; clients must not infer it from row order.
   */
  state?: TurnWorkState | null;
  toggle_key: string;
  [k: string]: unknown;
}

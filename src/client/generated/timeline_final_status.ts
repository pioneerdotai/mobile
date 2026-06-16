/* eslint-disable */

export type TimelineFinalStatusKind = 'Cancelled' | 'Blocked' | 'Failed' | 'Running' | 'Completed';

export interface TimelineFinalStatus {
  kind: TimelineFinalStatusKind;
  successful: boolean;
  [k: string]: unknown;
}

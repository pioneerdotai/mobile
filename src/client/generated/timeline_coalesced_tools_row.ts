/* eslint-disable */

export type TimelineCoalescedToolsKind = 'CompletedTaskTools' | 'RepeatedTaskWait';

export interface TimelineCoalescedToolsRow {
  count: number;
  is_open: boolean;
  kind: TimelineCoalescedToolsKind;
  toggle_key: string;
  [k: string]: unknown;
}

/* eslint-disable */

export type TimelineRowKind =
  | {
      Item: {
        timeline_index: number;
        [k: string]: unknown;
      };
    }
  | {
      TurnWorkToggle: TurnWorkGroupRow;
    }
  | {
      CoalescedTools: TimelineCoalescedToolsRow;
    }
  | {
      RunningTurn: RunningTurnDisplay;
    };
export type TimelineCoalescedToolsKind = 'CompletedTaskTools' | 'RepeatedTaskWait';

export interface TimelineRow {
  key: string;
  kind: TimelineRowKind;
  [k: string]: unknown;
}
export interface TurnWorkGroupRow {
  anchor_entry_id: string;
  elapsed_ms?: number | null;
  is_open: boolean;
  toggle_key: string;
  [k: string]: unknown;
}
export interface TimelineCoalescedToolsRow {
  count: number;
  is_open: boolean;
  kind: TimelineCoalescedToolsKind;
  toggle_key: string;
  [k: string]: unknown;
}
export interface RunningTurnDisplay {
  started_at_unix_ms?: number | null;
  turn_id: string;
  [k: string]: unknown;
}

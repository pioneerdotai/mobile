/* eslint-disable */

export type TurnWorkPresentation = 'expanded_live' | 'collapsed_after_final' | 'expanded_terminal_no_final';
export type TurnWorkState =
  | 'starting'
  | 'running'
  | 'waiting_for_approval'
  | 'stalled'
  | 'completed'
  | 'blocked'
  | 'failed'
  | 'interrupted';

export interface TurnWorkBlock {
  afterCursor?: TimelineCursor | null;
  beforeCursor?: TimelineCursor | null;
  completedAtUnixMs?: number | null;
  elapsedMs?: number | null;
  firstWorkItemId?: string | null;
  hasMoreAfter: boolean;
  hasMoreBefore: boolean;
  hiddenWorkCount: number;
  lastWorkItemId?: string | null;
  presentation: TurnWorkPresentation;
  startedAtUnixMs?: number | null;
  state: TurnWorkState;
  turnId: string;
  visibleWorkCount: number;
  workCount: number;
  [k: string]: unknown;
}
export interface TimelineCursor {
  value: string;
  [k: string]: unknown;
}

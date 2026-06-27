/* eslint-disable */

export interface TimelinePageInfo {
  afterCursor?: TimelineCursor | null;
  beforeCursor?: TimelineCursor | null;
  hasMoreAfter: boolean;
  hasMoreBefore: boolean;
  [k: string]: unknown;
}
export interface TimelineCursor {
  value: string;
  [k: string]: unknown;
}

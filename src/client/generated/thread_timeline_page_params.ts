/* eslint-disable */

export interface ThreadTimelinePageParams {
  anchor?:
    | {
        kind: 'newest';
        [k: string]: unknown;
      }
    | {
        kind: 'oldest';
        [k: string]: unknown;
      }
    | {
        cursor: TimelineCursor;
        kind: 'before';
        [k: string]: unknown;
      }
    | {
        cursor: TimelineCursor;
        kind: 'after';
        [k: string]: unknown;
      }
    | {
        cursor: TimelineCursor;
        kind: 'around';
        [k: string]: unknown;
      };
  limit?: number | null;
  threadId: string;
  [k: string]: unknown;
}
export interface TimelineCursor {
  value: string;
  [k: string]: unknown;
}

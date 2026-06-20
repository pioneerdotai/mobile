/* eslint-disable */

export type CLIRuntimeReviewTarget =
  | {
      type: 'uncommittedChanges';
      [k: string]: unknown;
    }
  | {
      branch: string;
      type: 'baseBranch';
      [k: string]: unknown;
    }
  | {
      sha: string;
      title?: string | null;
      type: 'commit';
      [k: string]: unknown;
    }
  | {
      instructions: string;
      type: 'custom';
      [k: string]: unknown;
    };

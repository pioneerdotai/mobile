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

export interface CLIRuntimeReviewStartParams {
  delivery?: 'inline' | 'detached';
  runtime_id: string;
  target: CLIRuntimeReviewTarget;
  thread_id: string;
  turn_id?: string | null;
  workspace_id: string;
  [k: string]: unknown;
}

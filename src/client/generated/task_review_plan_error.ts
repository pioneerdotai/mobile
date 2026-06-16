/* eslint-disable */

export type TaskReviewPlanError =
  | ('UserControlsNotAllowed' | 'MissingTaskId' | 'MissingRunId' | 'MissingCandidateId' | 'BlankFeedback')
  | {
      ActionNotAllowed: {
        action: TaskReviewAction;
        [k: string]: unknown;
      };
    };
export type TaskReviewAction = 'Accept' | 'Revise' | 'Cancel';

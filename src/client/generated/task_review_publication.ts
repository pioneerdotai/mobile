/* eslint-disable */

export type TaskReviewAction = 'Accept' | 'Revise' | 'Cancel';
export type TaskReviewRequestState =
  | {
      kind: 'idle';
      [k: string]: unknown;
    }
  | {
      action: TaskReviewAction;
      kind: 'pending';
      [k: string]: unknown;
    }
  | {
      action: TaskReviewAction;
      kind: 'succeeded';
      [k: string]: unknown;
    }
  | {
      error: TaskReviewFailure;
      kind: 'failed';
      [k: string]: unknown;
    }
  | {
      kind: 'cancelled';
      [k: string]: unknown;
    };
export type TaskReviewFailure =
  | {
      error: TaskReviewPlanError;
      kind: 'plan';
      [k: string]: unknown;
    }
  | {
      kind: 'transport';
      message: string;
      [k: string]: unknown;
    }
  | {
      kind: 'unavailable';
      [k: string]: unknown;
    };
export type TaskReviewPlanError =
  | ('UserControlsNotAllowed' | 'MissingTaskId' | 'MissingRunId' | 'MissingCandidateId' | 'BlankFeedback')
  | {
      ActionNotAllowed: {
        action: TaskReviewAction;
        [k: string]: unknown;
      };
    };

export interface TaskReviewPublication {
  allowed_actions: TaskReviewAction[];
  candidate_id: string;
  generation: number;
  item?: TaskWaitReviewDisplayItem | null;
  request: TaskReviewRequestState;
  revision: number;
  thread_id: string;
  visible_actions: TaskReviewAction[];
  [k: string]: unknown;
}
export interface TaskWaitReviewDisplayItem {
  allowed_actions: string[];
  candidate_id: string;
  candidate_status?: string | null;
  diagnostics: string[];
  extraction_error_preview?: string | null;
  max_revision_rounds?: number | null;
  owner_principal_id?: string | null;
  permission_mode?: string | null;
  permission_source?: string | null;
  remaining_revision_rounds?: number | null;
  result_preview?: string | null;
  review_mode?: string | null;
  revision_blocked_reason?: string | null;
  round?: number | null;
  run_id?: string | null;
  status?: string | null;
  summary?: string | null;
  task_id: string;
  title?: string | null;
  user_approval_required: boolean;
  [k: string]: unknown;
}

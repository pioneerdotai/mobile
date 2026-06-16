/* eslint-disable */

export interface TaskReviewActionState {
  action_errors: {
    [k: string]: string;
  };
  actions_in_flight: string[];
  [k: string]: unknown;
}

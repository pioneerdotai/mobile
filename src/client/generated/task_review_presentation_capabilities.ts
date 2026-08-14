/* eslint-disable */

/**
 * Exact Task action vocabulary projected by the Gateway for the active
 * thread. Candidate state is intersected separately from authorization so a
 * role cannot acquire review authority from ownership or another capability.
 */
export interface TaskReviewPresentationCapabilities {
  can_cancel: boolean;
  can_review: boolean;
}

/* eslint-disable */

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

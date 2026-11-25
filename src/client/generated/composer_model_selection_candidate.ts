/* eslint-disable */

export interface ComposerModelSelectionCandidate {
  has_turns: boolean;
  selection?: ComposerModelSelection | null;
  thread_id: string;
  updated_at: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ComposerModelSelection {
  model: string;
  provider: string;
  selected_context_authority?: string | null;
  selected_context_window?: number | null;
  selected_reasoning_effort?: string | null;
  selected_service_mode?: {
    id: string;
    authority: string;
  } | null;
  [k: string]: unknown;
}

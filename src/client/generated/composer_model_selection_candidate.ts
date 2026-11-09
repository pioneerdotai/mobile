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
  selected_context_window?: number | null;
  selected_context_authority?: string | null;
  model: string;
  provider: string;
  selected_reasoning_effort?: string | null;
  [k: string]: unknown;
}

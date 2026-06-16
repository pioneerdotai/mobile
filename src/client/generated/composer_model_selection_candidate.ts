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
  [k: string]: unknown;
}

/* eslint-disable */

export interface ComposerModelSelection {
  selected_context_window?: number | null;
  selected_context_authority?: string | null;
  model: string;
  provider: string;
  selected_reasoning_effort?: string | null;
  [k: string]: unknown;
}

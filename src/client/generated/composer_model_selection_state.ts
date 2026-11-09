/* eslint-disable */

export interface ComposerModelSelectionState {
  selected_context_window?: number | null;
  selected_context_authority?: string | null;
  manually_selected: boolean;
  selected_model?: string | null;
  selected_provider?: string | null;
  selected_reasoning_effort?: string | null;
  [k: string]: unknown;
}

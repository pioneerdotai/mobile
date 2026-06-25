/* eslint-disable */

export interface ComposerModelSelectionState {
  manually_selected: boolean;
  selected_model?: string | null;
  selected_provider?: string | null;
  selected_reasoning_effort?: string | null;
  [k: string]: unknown;
}

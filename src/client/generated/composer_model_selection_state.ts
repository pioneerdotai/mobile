/* eslint-disable */

export interface ComposerModelSelectionState {
  manually_selected: boolean;
  selected_context_authority?: string | null;
  selected_context_window?: number | null;
  selected_model?: string | null;
  selected_provider?: string | null;
  selected_reasoning_effort?: string | null;
  selected_service_mode?: {
    id: string;
    authority: string;
  } | null;
  [k: string]: unknown;
}

/* eslint-disable */

export interface ModelProviderSelectionUpdate {
  selected_context_window?: number | null;
  selected_context_authority?: string | null;
  clear_models: boolean;
  loading_models: boolean;
  selected_model?: string | null;
  selected_provider?: string | null;
  selected_reasoning_effort?: string | null;
  [k: string]: unknown;
}

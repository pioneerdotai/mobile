/* eslint-disable */

export interface ModelProviderSelectionUpdate {
  clear_models: boolean;
  loading_models: boolean;
  selected_model?: string | null;
  selected_provider?: string | null;
  selected_reasoning_effort?: string | null;
  [k: string]: unknown;
}

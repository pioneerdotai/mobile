/* eslint-disable */

export interface ModelProviderSelectionUpdate {
  clear_models: boolean;
  loading_models: boolean;
  selected_model?: string | null;
  selected_provider?: string | null;
  [k: string]: unknown;
}

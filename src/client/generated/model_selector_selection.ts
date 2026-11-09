/* eslint-disable */

export interface ModelSelectorSelection {
  selected_context_window?: number | null;
  selected_context_authority?: string | null;
  model?: string | null;
  provider?: string | null;
  selected_reasoning_effort?: string | null;
  [k: string]: unknown;
}

/* eslint-disable */

export interface ComposerModelSelection {
  model: string;
  provider: string;
  selected_context_authority?: string | null;
  selected_context_window?: number | null;
  selected_reasoning_effort?: string | null;
  selected_service_mode?: {
    id: string;
    authority: string;
  } | null;
  [k: string]: unknown;
}

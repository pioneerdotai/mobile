/* eslint-disable */

export interface ModelSelectorSelection {
  model?: string | null;
  provider?: string | null;
  selected_context_authority?: string | null;
  selected_context_window?: number | null;
  selected_reasoning_effort?: string | null;
  selected_service_mode?: NativeServiceModeSelection | null;
  [k: string]: unknown;
}
/**
 * Explicit choice uses the existing endpoint/credential/model authority proof.
 * Absence means Standard; Inherit belongs to the enclosing model selection.
 */
export interface NativeServiceModeSelection {
  authority: string;
  id: string;
}

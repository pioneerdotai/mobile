/* eslint-disable */

export interface TurnReasoningSelection {
  /**
   * String-valued because CLI runtimes may advertise efforts newer than
   * Pioneer API-provider adapters understand.
   */
  effort: string;
  [k: string]: unknown;
}

/* eslint-disable */

export type PrincipalId = string;

export interface ThreadParticipantsResponse {
  changed?: boolean;
  /**
   * Compatibility list retained for clients predating participant summary
   * DTOs.
   */
  participant_ids?: PrincipalId[];
  participants?: ThreadParticipantSummary[];
  thread_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ThreadParticipantSummary {
  principal_id: PrincipalId;
  [k: string]: unknown;
}

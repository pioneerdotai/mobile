/* eslint-disable */

export type PrincipalId = string;

export interface ThreadParticipantMutationParams {
  principal_id: PrincipalId;
  thread_id: string;
  workspace_id: string;
  [k: string]: unknown;
}

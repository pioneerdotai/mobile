/* eslint-disable */

export interface ComposerVoiceFinalizeRequest {
  operation: ComposerOperationIdentity;
}
export interface ComposerOperationIdentity {
  draft_id: number;
  generation: number;
  thread_id: string;
  [k: string]: unknown;
}

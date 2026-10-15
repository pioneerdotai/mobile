/* eslint-disable */

export interface ComposerVoiceCancelRequest {
  operation: ComposerOperationIdentity;
  reason?: string | null;
  session_id: string;
}
export interface ComposerOperationIdentity {
  draft_id: number;
  generation: number;
  thread_id: string;
  [k: string]: unknown;
}

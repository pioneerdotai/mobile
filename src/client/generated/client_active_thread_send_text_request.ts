/* eslint-disable */

export interface ClientActiveThreadSendTextRequest {
  expanded_keys?: string[];
  operation: ComposerOperationIdentity;
  workspace_id?: string | null;
}
export interface ComposerOperationIdentity {
  draft_id: number;
  generation: number;
  thread_id: string;
  [k: string]: unknown;
}

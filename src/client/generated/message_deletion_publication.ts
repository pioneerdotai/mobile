/* eslint-disable */

export type MessageDeletionState =
  | {
      kind: 'confirming';
      [k: string]: unknown;
    }
  | {
      kind: 'pending';
      [k: string]: unknown;
    }
  | {
      kind: 'completed';
      [k: string]: unknown;
    }
  | {
      conflicted: boolean;
      kind: 'failed';
      [k: string]: unknown;
    }
  | {
      kind: 'cancelled';
      [k: string]: unknown;
    };

export interface MessageDeletionPublication {
  plan: MessageDeletionPlan;
  request_generation: number;
  revision: number;
  state: MessageDeletionState;
  thread_id: string;
  [k: string]: unknown;
}
export interface MessageDeletionPlan {
  expected_revision: number;
  identity: MessageDeletionIdentity;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface MessageDeletionIdentity {
  generation: number;
  thread_id: string;
  [k: string]: unknown;
}

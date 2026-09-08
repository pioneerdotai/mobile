/* eslint-disable */

export type TurnCancellationState =
  | {
      kind: 'pending';
      [k: string]: unknown;
    }
  | {
      kind: 'completed';
      [k: string]: unknown;
    }
  | {
      kind: 'failed';
      message: string;
      [k: string]: unknown;
    }
  | {
      kind: 'cancelled';
      [k: string]: unknown;
    };

export interface TurnCancellationPublication {
  identity: TurnCancellationIdentity;
  revision: number;
  state: TurnCancellationState;
  [k: string]: unknown;
}
export interface TurnCancellationIdentity {
  generation: number;
  thread_id: string;
  turn_id: string;
  [k: string]: unknown;
}

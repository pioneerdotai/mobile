/* eslint-disable */

export type PendingRequestActionKind = 'cancel_turn' | 'deny' | 'allow' | 'allow_for_turn' | 'answer';
export type PendingRequestResolution =
  | {
      resolution: 'allow';
      [k: string]: unknown;
    }
  | {
      resolution: 'allow_for_turn';
      [k: string]: unknown;
    }
  | {
      resolution: 'allow_for_session';
      [k: string]: unknown;
    }
  | {
      reason?: string | null;
      resolution: 'deny';
      [k: string]: unknown;
    }
  | {
      resolution: 'cancel';
      [k: string]: unknown;
    }
  | {
      resolution: 'answered';
      response?: unknown;
      [k: string]: unknown;
    }
  | {
      resolution: 'expired';
      [k: string]: unknown;
    };

export interface PendingRequestAvailableAction {
  kind: PendingRequestActionKind;
  resolution?: PendingRequestResolution | null;
  [k: string]: unknown;
}

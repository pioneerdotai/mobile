/* eslint-disable */

export type RequestStatus =
  | {
      status: 'idle';
      [k: string]: unknown;
    }
  | {
      attempt: number;
      generation: number;
      status: 'pending';
      [k: string]: unknown;
    }
  | {
      generation: number;
      status: 'ready';
      value: unknown;
      [k: string]: unknown;
    }
  | {
      attempt: number;
      error: ClientRequestFailure;
      generation: number;
      status: 'failed';
      [k: string]: unknown;
    }
  | {
      generation: number;
      status: 'cancelled';
      [k: string]: unknown;
    };

export interface RequestState {
  latest_generation: number;
  status: RequestStatus;
  [k: string]: unknown;
}
export interface ClientRequestFailure {
  code: string;
  [k: string]: unknown;
}

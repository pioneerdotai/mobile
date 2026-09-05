/* eslint-disable */

export type ClientEffectResult =
  | {
      kind: 'completed';
      [k: string]: unknown;
    }
  | {
      code: string;
      kind: 'failed';
      [k: string]: unknown;
    };

export interface ClientEffectCompletion {
  generation: number;
  operation_id: string;
  result: ClientEffectResult;
  [k: string]: unknown;
}

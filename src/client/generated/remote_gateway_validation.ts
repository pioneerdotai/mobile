/* eslint-disable */

export type RemoteGatewayValidation =
  | {
      address: string;
      state: 'reachable';
      [k: string]: unknown;
    }
  | {
      address: string;
      state: 'unreachable';
      [k: string]: unknown;
    };

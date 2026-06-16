/* eslint-disable */

export type GatewayAuthTokenUpdate =
  | {
      mode: 'preserve';
      [k: string]: unknown;
    }
  | {
      mode: 'replace';
      token: string;
      [k: string]: unknown;
    }
  | {
      mode: 'clear';
      [k: string]: unknown;
    };

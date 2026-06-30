/* eslint-disable */

export type PendingRequestOrigin =
  | {
      origin: 'cli_runtime';
      runtime_id: string;
      [k: string]: unknown;
    }
  | {
      origin: 'native_permission_gate';
      [k: string]: unknown;
    };

/* eslint-disable */

export type RuntimeStatus =
  | {
      state: 'disabled';
      [k: string]: unknown;
    }
  | {
      binary_path?: string | null;
      state: 'missing_binary';
      [k: string]: unknown;
    }
  | {
      message: string;
      state: 'spawn_failed';
      [k: string]: unknown;
    }
  | {
      state: 'initializing';
      [k: string]: unknown;
    }
  | {
      state: 'needs_auth';
      [k: string]: unknown;
    }
  | {
      state: 'ready';
      [k: string]: unknown;
    }
  | {
      message: string;
      state: 'degraded';
      [k: string]: unknown;
    }
  | {
      minimum_version?: string | null;
      state: 'unsupported_version';
      version?: string | null;
      [k: string]: unknown;
    }
  | {
      message: string;
      state: 'error';
      [k: string]: unknown;
    };

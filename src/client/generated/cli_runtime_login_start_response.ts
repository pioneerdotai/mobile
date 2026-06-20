/* eslint-disable */

export type CLIRuntimeLoginStartType = 'chatgptDeviceCode' | 'chatgpt';
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

export interface CLIRuntimeLoginStartResponse {
  auth_url?: string | null;
  login_id?: string | null;
  login_type: CLIRuntimeLoginStartType;
  message?: string | null;
  raw?: unknown;
  runtime_id: string;
  status: RuntimeStatus;
  user_code?: string | null;
  verification_url?: string | null;
  [k: string]: unknown;
}

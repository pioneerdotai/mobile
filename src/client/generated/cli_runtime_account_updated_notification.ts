/* eslint-disable */

export type CLIAgentRuntimeKind = 'codex' | 'claude';
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

export interface CLIRuntimeAccountUpdatedNotification {
  account?: RuntimeAccountSnapshot | null;
  kind?: CLIAgentRuntimeKind | null;
  runtime_id: string;
  status: RuntimeStatus;
  workspace_id: string;
  [k: string]: unknown;
}
export interface RuntimeAccountSnapshot {
  account_id?: string | null;
  auth_method?: string | null;
  authenticated: boolean;
  display_name?: string | null;
  email?: string | null;
  plan?: string | null;
  [k: string]: unknown;
}

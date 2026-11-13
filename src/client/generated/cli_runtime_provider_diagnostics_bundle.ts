/* eslint-disable */

export type RuntimeDiagnosticLevel = 'info' | 'warning' | 'error';
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

export interface CLIRuntimeProviderDiagnosticsBundle {
  binary_path?: string | null;
  debug_native_events_enabled?: boolean;
  diagnostics?: RuntimeDiagnostic[];
  display_name: string;
  enabled: boolean;
  home_path?: string | null;
  kind: CLIAgentRuntimeKind;
  models_refreshed_at_unix_ms?: number | null;
  notes?: string[];
  recent_stderr?: string[];
  runtime_id: string;
  schema_version: number;
  shadow_home_path?: string | null;
  status: RuntimeStatus;
  version?: string | null;
  [k: string]: unknown;
}
export interface RuntimeDiagnostic {
  code: string;
  level: RuntimeDiagnosticLevel;
  message: string;
  [k: string]: unknown;
}

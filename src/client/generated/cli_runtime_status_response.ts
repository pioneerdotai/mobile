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

export interface CLIRuntimeStatusResponse {
  runtime: RuntimeSummary;
  [k: string]: unknown;
}
export interface RuntimeSummary {
  account?: RuntimeAccountSnapshot | null;
  binary_path?: string | null;
  capabilities: RuntimeCapabilities;
  debug_native_events_enabled?: boolean;
  diagnostics?: RuntimeDiagnostic[];
  display_name: string;
  enabled: boolean;
  home_path?: string | null;
  kind: CLIAgentRuntimeKind;
  models_refreshed_at_unix_ms?: number | null;
  proxy_url?: string | null;
  recent_stderr?: string[];
  runtime_id: string;
  shadow_home_path?: string | null;
  status: RuntimeStatus;
  version?: string | null;
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
export interface RuntimeCapabilities {
  supports_approvals: boolean;
  supports_apps: boolean;
  supports_auth_management: boolean;
  supports_command_approvals: boolean;
  supports_compaction: boolean;
  supports_diff_updates: boolean;
  supports_file_change_approvals: boolean;
  supports_fork: boolean;
  supports_generated_schema_probe: boolean;
  supports_goal: boolean;
  supports_history_read: boolean;
  supports_interrupt: boolean;
  supports_model_list: boolean;
  supports_resume: boolean;
  supports_review: boolean;
  supports_steer: boolean;
  supports_thread_archive: boolean;
  supports_threads: boolean;
  supports_user_input_requests: boolean;
  [k: string]: unknown;
}
export interface RuntimeDiagnostic {
  code: string;
  level: RuntimeDiagnosticLevel;
  message: string;
  [k: string]: unknown;
}

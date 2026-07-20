/* eslint-disable */

export type TimelineRowKind =
  | {
      Item: {
        timeline_index: number;
        [k: string]: unknown;
      };
    }
  | {
      TurnWorkToggle: TurnWorkGroupRow;
    }
  | {
      CoalescedTools: TimelineCoalescedToolsRow;
    }
  | {
      RunningTurn: RunningTurnDisplay;
    };
export type TimelineCoalescedToolsKind = 'CompletedTaskTools' | 'RepeatedTaskWait';
export type PermissionBehavior = 'allow' | 'ask' | 'deny';
export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';
export type TurnPermissionProfileSource =
  'composer' | 'defaulted' | 'inherited_from_parent_turn' | 'task_permission_cap' | 'system';
export type TurnSecurityCapabilityKind = 'filesystem' | 'network' | 'process' | 'approval' | 'sandbox_backend';
export type ClientSecurityEnforcementStatus = 'active' | 'degraded' | 'unavailable';
export type TurnSecurityExecutionBackendKind = 'native' | 'codex_cli' | 'claude_cli';
export type ClientSecurityFilesystemAccess = 'unrestricted' | 'read_only' | 'workspace_write';
export type TurnNetworkMode = 'disabled' | 'restricted' | 'enabled';
export type SandboxBackendKind = 'nono' | 'windows_restricted_token' | 'provider_native';
export type TurnSandboxMode = 'unrestricted' | 'read_only' | 'workspace_write';
export type TurnWorkState =
  'starting' | 'running' | 'waiting_for_approval' | 'stalled' | 'completed' | 'blocked' | 'failed' | 'interrupted';

export interface TimelineRow {
  key: string;
  kind: TimelineRowKind;
  [k: string]: unknown;
}
export interface TurnWorkGroupRow {
  anchor_entry_id: string;
  elapsed_ms?: number | null;
  is_open: boolean;
  toggle_key: string;
  [k: string]: unknown;
}
export interface TimelineCoalescedToolsRow {
  count: number;
  is_open: boolean;
  kind: TimelineCoalescedToolsKind;
  toggle_key: string;
  [k: string]: unknown;
}
export interface RunningTurnDisplay {
  message?: string | null;
  permission_profile?: TurnPermissionProfileSnapshot | null;
  security_summary?: ClientTurnSecuritySummary | null;
  started_at_unix_ms?: number | null;
  state?: TurnWorkState | null;
  turn_id: string;
  [k: string]: unknown;
}
export interface TurnPermissionProfileSnapshot {
  effective_policy: ToolPermissionPolicySnapshot;
  mode: TurnPermissionMode;
  source: TurnPermissionProfileSource;
  [k: string]: unknown;
}
export interface ToolPermissionPolicySnapshot {
  allowed_paths?: string[];
  allowed_tools?: string[];
  computer_use: PermissionBehavior;
  default_behavior: PermissionBehavior;
  denied_tools?: string[];
  dynamic_skill_tool: PermissionBehavior;
  file_read: PermissionBehavior;
  file_write: PermissionBehavior;
  mcp_read: PermissionBehavior;
  mcp_write_or_unknown: PermissionBehavior;
  network: PermissionBehavior;
  shell_command: PermissionBehavior;
  task_subagent: PermissionBehavior;
  [k: string]: unknown;
}
export interface ClientTurnSecuritySummary {
  diagnostics?: ClientSecurityDiagnostic[];
  enforcement: ClientSecurityEnforcementStatus;
  execution_backend: TurnSecurityExecutionBackendKind;
  filesystem_access: ClientSecurityFilesystemAccess;
  network_mode: TurnNetworkMode;
  permission_mode: TurnPermissionMode;
  sandbox_backend?: SandboxBackendKind | null;
  sandbox_mode: TurnSandboxMode;
  [k: string]: unknown;
}
export interface ClientSecurityDiagnostic {
  capability: TurnSecurityCapabilityKind;
  message: string;
  status: ClientSecurityEnforcementStatus;
  [k: string]: unknown;
}

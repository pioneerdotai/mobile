/* eslint-disable */

export type TurnSecurityCapabilityKind = 'filesystem' | 'network' | 'process' | 'approval' | 'sandbox_backend';
export type ClientSecurityEnforcementStatus = 'active' | 'degraded' | 'unavailable';
export type TurnSecurityExecutionBackendKind = 'native' | 'codex_cli' | 'claude_cli';
export type ClientSecurityFilesystemAccess = 'unrestricted' | 'read_only' | 'workspace_write';
export type TurnNetworkMode = 'disabled' | 'restricted' | 'enabled';
export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';
export type SandboxBackendKind = 'nono' | 'windows_restricted_token' | 'provider_native';
export type TurnSandboxMode = 'unrestricted' | 'read_only' | 'workspace_write';

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

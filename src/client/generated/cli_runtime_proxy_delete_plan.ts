/* eslint-disable */

export type CLIRuntimeProxyDeletePlan =
  | {
      Send: CLIRuntimeProxyActionRequest;
    }
  | {
      Unavailable: ProviderApiKeyActionUnavailable;
    };
export type ProviderApiKeyActionUnavailable = 'GatewayNotConnected' | 'WorkspaceNotSelected';

export interface CLIRuntimeProxyActionRequest {
  connection_id: number;
  params: CLIRuntimeProxyDeleteParams;
  runtime_id: string;
  [k: string]: unknown;
}
export interface CLIRuntimeProxyDeleteParams {
  runtime_id: string;
  workspace_id: string;
  [k: string]: unknown;
}

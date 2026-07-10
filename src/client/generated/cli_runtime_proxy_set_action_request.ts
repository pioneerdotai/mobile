/* eslint-disable */

export interface CLIRuntimeProxyActionRequest {
  connection_id: number;
  params: CLIRuntimeProxySetParams;
  runtime_id: string;
  [k: string]: unknown;
}
export interface CLIRuntimeProxySetParams {
  proxy_url: string;
  runtime_id: string;
  workspace_id: string;
  [k: string]: unknown;
}

/* eslint-disable */

export interface CLIRuntimeLoginStartParams {
  login_type?: 'chatgptDeviceCode' | 'chatgpt';
  runtime_id: string;
  workspace_id: string;
  [k: string]: unknown;
}

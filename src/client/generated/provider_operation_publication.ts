/* eslint-disable */

export type ProviderActionKind =
  | 'acp_session'
  | 'configure'
  | 'disconnect'
  | 'connect'
  | 'set_runtime_proxy'
  | 'remove_runtime_proxy'
  | 'save_runtime'
  | 'set_runtime_enabled';
export type ProviderLoadState = 'idle' | 'loading' | 'ready' | 'failed' | 'forbidden' | 'cancelled';

export interface ProviderOperationPublication {
  action: ProviderActionKind;
  generation: number;
  request: ProviderLoadState;
  revision: number;
  target: string;
  workspace_id: string;
  [k: string]: unknown;
}

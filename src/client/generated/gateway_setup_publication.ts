/* eslint-disable */

export type GatewaySetupAction = 'ConnectRemote' | 'StartLocal' | 'SaveGateway' | 'DeleteGateway';
export type GatewaySetupMode =
  | {
      allow_local: boolean;
      kind: 'initial';
      [k: string]: unknown;
    }
  | {
      allow_local: boolean;
      kind: 'add_gateway';
      [k: string]: unknown;
    }
  | {
      endpoint_id: string;
      kind: 'edit_gateway';
      [k: string]: unknown;
    }
  | {
      close_on_success: boolean;
      endpoint_id: string;
      kind: 'reauthenticate_gateway';
      [k: string]: unknown;
    };

export interface GatewaySetupPublication {
  action?: GatewaySetupAction | null;
  activation_error?: string | null;
  activation_valid: boolean;
  address: string;
  address_error?: string | null;
  completed_endpoint?: string | null;
  error?: string | null;
  input_reset_generation: number;
  input_revision: number;
  mode: GatewaySetupMode;
  name: string;
  name_error?: string | null;
  owner_generation: number;
  pending: boolean;
  revision: number;
  [k: string]: unknown;
}

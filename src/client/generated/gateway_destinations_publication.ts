/* eslint-disable */

export type GatewayEndpointKind = 'local' | 'remote';
export type GatewayId = string;

export interface GatewayDestinationsPublication {
  action_generation: number;
  endpoints: GatewayEndpoint[];
  error?: string | null;
  installation_id?: string | null;
  loading: boolean;
  local_install_required: boolean;
  local_update_required: boolean;
  outcome?: GatewayDestinationOutcome | null;
  pending_endpoint?: string | null;
  registry_revision: number;
  selected_endpoint?: string | null;
  warnings: GatewaySetupWarning[];
  workspace_outcomes: GatewayWorkspaceOutcome[];
  [k: string]: unknown;
}
export interface GatewayEndpoint {
  gateway_base_url: string;
  id: string;
  kind: GatewayEndpointKind;
  name: string;
  server_gateway_id?: GatewayId | null;
  service_name?: string | null;
  session_ref?: string | null;
  workspace_id?: string | null;
}
export interface GatewayDestinationOutcome {
  endpoint_id: string;
  generation: number;
  succeeded: boolean;
  [k: string]: unknown;
}
export interface GatewaySetupWarning {
  id: number;
  message: string;
  [k: string]: unknown;
}
export interface GatewayWorkspaceOutcome {
  endpoint_id: string;
  request_id: string;
  succeeded: boolean;
  [k: string]: unknown;
}

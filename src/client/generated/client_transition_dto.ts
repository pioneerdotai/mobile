/* eslint-disable */

export type ClientPlannedEffect =
  ClientEffect | AdministrationPresentationEffect | ProviderPresentationEffect | GatewaySessionStorageEffect;
export type ClientEffect =
  | (
      | 'RefreshWorkspaceList'
      | 'RefreshGatewaySettings'
      | 'RefreshProviderLists'
      | 'QueueSkillsRefresh'
      | 'EnqueueInFlightTurnsForResume'
    )
  | {
      UnsubscribeThreads: {
        thread_ids: string[];
        [k: string]: unknown;
      };
    };
export type AdministrationPresentationEffect = {
  kind: 'copy_administration_activation';
  [k: string]: unknown;
};
export type ProviderPresentationEffect =
  | {
      kind: 'copy_provider_diagnostics';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'open_provider_path';
      path: string;
      [k: string]: unknown;
    };
export type GatewaySessionStorageEffect =
  | {
      ReadGatewaySession: {
        endpoint: GatewayEndpoint;
        [k: string]: unknown;
      };
    }
  | {
      PersistGatewaySession: {
        endpoint: GatewayEndpoint;
        envelope: GatewaySessionEnvelope;
        [k: string]: unknown;
      };
    };
export type GatewayEndpointKind = 'local' | 'remote';
export type GatewayId = string;
export type DeviceId = string;
export type PrincipalId = string;
export type AuthSessionId = string;
export type TokenFamilyId = string;
export type ClientTransitionOutcome = 'changed' | 'noop' | 'stale' | 'rejected';

export interface ClientTransitionDto {
  effects: ClientEffectPlan[];
  outcome: ClientTransitionOutcome;
  schema_version: number;
  sequence: number;
  [k: string]: unknown;
}
export interface ClientEffectPlan {
  effect: ClientPlannedEffect;
  generation: number;
  operation_id: string;
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
export interface GatewaySessionEnvelope {
  device_id: DeviceId;
  gateway_id: GatewayId;
  installation_id: string;
  pending_refresh_request_id?: string | null;
  principal_id: PrincipalId;
  refresh_expires_at_unix: number;
  refresh_generation: number;
  refresh_token: string;
  schema_version: number;
  session_id: AuthSessionId;
  token_family_id: TokenFamilyId;
}

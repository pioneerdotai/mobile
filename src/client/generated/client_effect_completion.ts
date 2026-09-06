/* eslint-disable */

export type ClientEffectResult =
  | {
      envelope?: GatewaySessionEnvelope | null;
      kind: 'gateway_session_envelope_loaded';
      [k: string]: unknown;
    }
  | {
      kind: 'completed';
      [k: string]: unknown;
    }
  | {
      code: string;
      kind: 'failed';
      [k: string]: unknown;
    };
export type DeviceId = string;
export type GatewayId = string;
export type PrincipalId = string;
export type AuthSessionId = string;
export type TokenFamilyId = string;

export interface ClientEffectCompletion {
  generation: number;
  operation_id: string;
  result: ClientEffectResult;
  [k: string]: unknown;
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

/* eslint-disable */

export type SessionLifecycleEvent =
  | {
      kind: 'no_stored_session';
      [k: string]: unknown;
    }
  | {
      kind: 'device_activation_required';
      [k: string]: unknown;
    }
  | {
      data: GatewaySessionMetadata;
      kind: 'stored_session_loaded';
      [k: string]: unknown;
    }
  | {
      data: {
        access_expires_at_unix: number;
        intent_id: number;
        metadata: GatewaySessionMetadata;
        [k: string]: unknown;
      };
      kind: 'refresh_grant_received';
      [k: string]: unknown;
    }
  | {
      data: {
        intent_id: number;
        [k: string]: unknown;
      };
      kind: 'secure_storage_committed';
      [k: string]: unknown;
    }
  | {
      data: {
        intent_id: number;
        [k: string]: unknown;
      };
      kind: 'secure_storage_failed';
      [k: string]: unknown;
    }
  | {
      data: {
        generation: number;
        [k: string]: unknown;
      };
      kind: 'connection_established';
      [k: string]: unknown;
    }
  | {
      data: {
        generation: number;
        now_unix: number;
        [k: string]: unknown;
      };
      kind: 'connection_transport_failed';
      [k: string]: unknown;
    }
  | {
      data: {
        generation: number;
        [k: string]: unknown;
      };
      kind: 'connection_event_observed';
      [k: string]: unknown;
    }
  | {
      data: {
        now_unix: number;
        refresh_leeway_seconds: number;
        [k: string]: unknown;
      };
      kind: 'clock_advanced';
      [k: string]: unknown;
    }
  | {
      data: {
        intent_id: number;
        [k: string]: unknown;
      };
      kind: 'refresh_transport_lost';
      [k: string]: unknown;
    }
  | {
      data: {
        reason: SessionTerminalReason;
        [k: string]: unknown;
      };
      kind: 'auth_failed';
      [k: string]: unknown;
    };
export type DeviceId = string;
export type GatewayId = string;
export type AuthSessionId = string;
export type SessionTerminalReason =
  | 'authentication_required'
  | 'session_revoked'
  | 'session_expired'
  | 'session_compromised'
  | 'principal_suspended'
  | 'principal_removed'
  | 'gateway_identity_mismatch'
  | 'secure_storage_failed'
  | 'refresh_outcome_unknown'
  | 'refresh_credential_invalid';

export interface ClientGatewaySessionLifecycleRequest {
  endpoint_id: string;
  event: SessionLifecycleEvent;
}
export interface GatewaySessionMetadata {
  device_id: DeviceId;
  gateway_id: GatewayId;
  refresh_expires_at_unix: number;
  refresh_generation: number;
  session_id: AuthSessionId;
  [k: string]: unknown;
}

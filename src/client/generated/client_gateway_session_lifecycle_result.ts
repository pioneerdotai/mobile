/* eslint-disable */

export type SessionLifecycleEffect =
  | {
      kind: 'none';
      [k: string]: unknown;
    }
  | {
      kind: 'begin_device_activation';
      [k: string]: unknown;
    }
  | {
      data: {
        intent_id: number;
        session_id: AuthSessionId;
        [k: string]: unknown;
      };
      kind: 'begin_refresh';
      [k: string]: unknown;
    }
  | {
      data: {
        candidate_connection_generation: number;
        intent_id: number;
        [k: string]: unknown;
      };
      kind: 'persist_refresh_before_access';
      [k: string]: unknown;
    }
  | {
      data: {
        connection_generation: number;
        [k: string]: unknown;
      };
      kind: 'connect_with_ephemeral_access';
      [k: string]: unknown;
    }
  | {
      data: {
        connection_generation: number;
        [k: string]: unknown;
      };
      kind: 'retry_connection';
      [k: string]: unknown;
    }
  | {
      data: {
        active_connection_generation: number;
        close_connection_generation?: number | null;
        [k: string]: unknown;
      };
      kind: 'switch_connection';
      [k: string]: unknown;
    }
  | {
      data: {
        generation: number;
        [k: string]: unknown;
      };
      kind: 'ignore_stale_connection_event';
      [k: string]: unknown;
    }
  | {
      data: {
        reason: SessionTerminalReason;
        [k: string]: unknown;
      };
      kind: 'stop';
      [k: string]: unknown;
    };
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
export type SessionLifecycleState =
  | {
      kind: 'no_session';
      [k: string]: unknown;
    }
  | {
      kind: 'needs_device_activation';
      [k: string]: unknown;
    }
  | {
      data: {
        intent_id: number;
        metadata: GatewaySessionMetadata;
        previous_connection_generation?: number | null;
        [k: string]: unknown;
      };
      kind: 'refreshing';
      [k: string]: unknown;
    }
  | {
      data: {
        access_expires_at_unix: number;
        candidate_connection_generation: number;
        intent_id: number;
        metadata: GatewaySessionMetadata;
        previous_connection_generation?: number | null;
        [k: string]: unknown;
      };
      kind: 'awaiting_secure_storage';
      [k: string]: unknown;
    }
  | {
      data: {
        access_expires_at_unix: number;
        connection_generation: number;
        metadata: GatewaySessionMetadata;
        previous_connection_generation?: number | null;
        [k: string]: unknown;
      };
      kind: 'connecting';
      [k: string]: unknown;
    }
  | {
      data: {
        access_expires_at_unix: number;
        connection_generation: number;
        metadata: GatewaySessionMetadata;
        [k: string]: unknown;
      };
      kind: 'active';
      [k: string]: unknown;
    }
  | {
      data: {
        metadata?: GatewaySessionMetadata | null;
        reason: SessionTerminalReason;
        [k: string]: unknown;
      };
      kind: 'terminal';
      [k: string]: unknown;
    };
export type DeviceId = string;
export type GatewayId = string;

export interface ClientGatewaySessionLifecycleResult {
  effect: SessionLifecycleEffect;
  state: SessionLifecycleState;
  [k: string]: unknown;
}
export interface GatewaySessionMetadata {
  device_id: DeviceId;
  gateway_id: GatewayId;
  refresh_expires_at_unix: number;
  refresh_generation: number;
  session_id: AuthSessionId;
  [k: string]: unknown;
}

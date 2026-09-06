/* eslint-disable */

export type DeviceId = string;
export type GatewayId = string;
export type AuthSessionId = string;
export type GatewaySessionConnectionFailure =
  | {
      kind: 'terminal';
      reason: SessionTerminalReason;
      [k: string]: unknown;
    }
  | {
      kind: 'suspended';
      [k: string]: unknown;
    }
  | {
      code: string;
      kind: 'unavailable';
      [k: string]: unknown;
    };
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
      data: {
        metadata?: GatewaySessionMetadata | null;
        [k: string]: unknown;
      };
      kind: 'suspended';
      [k: string]: unknown;
    }
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
export type StartupStageState = 'pending' | 'succeeded' | 'failed' | 'cancelled';
export type GatewayConnectionState = 'Idle' | 'Connecting' | 'Connected' | 'Reconnecting' | 'Disconnected';
export type GatewayStatusTextUpdate =
  | 'KeepExisting'
  | {
      Set: GatewayStatusMessage;
    };
export type GatewayStatusMessage =
  | (
      | 'Connecting'
      | 'StartingLocal'
      | 'Connected'
      | 'NotConfigured'
      | 'Unavailable'
      | 'LocalConflict'
      | 'SubsystemNotReady'
    )
  | {
      ConnectingNamed: {
        endpoint_name: string;
        [k: string]: unknown;
      };
    }
  | {
      Reconnecting: {
        attempt: number;
        delay_ms: number;
        endpoint_name: string;
        [k: string]: unknown;
      };
    }
  | {
      ConnectedEndpoint: {
        endpoint_name: string;
        gateway_base_url: string;
        [k: string]: unknown;
      };
    }
  | {
      LocalStopped: {
        gateway_base_url: string;
        [k: string]: unknown;
      };
    }
  | {
      RemoteUnavailable: {
        endpoint_name: string;
        gateway_base_url: string;
        [k: string]: unknown;
      };
    }
  | {
      LocalConflictAt: {
        gateway_base_url: string;
        [k: string]: unknown;
      };
    }
  | {
      FailedCheck: {
        error: string;
        [k: string]: unknown;
      };
    }
  | {
      SubsystemFailed: {
        error: string;
        [k: string]: unknown;
      };
    };
export type GatewayStatusLevel = 'Neutral' | 'Connected' | 'Degraded' | 'Failed';

export interface GatewaySessionPublication {
  access_expiries: {
    [k: string]: number;
  };
  connections: {
    [k: string]: GatewaySessionConnectionProjection;
  };
  gateway_error?: string | null;
  sessions: {
    [k: string]: SessionLifecycleState;
  };
  startup: StartupCoordinator;
  status?: GatewayStatusProjection | null;
  [k: string]: unknown;
}
export interface GatewaySessionConnectionProjection {
  connected?: GatewaySessionConnectionResult | null;
  epoch: number;
  failure?: GatewaySessionConnectionFailure | null;
  pending: boolean;
  refresh_requested: boolean;
  retry_delay_ms?: number | null;
  [k: string]: unknown;
}
export interface GatewaySessionConnectionResult {
  access_expires_at_unix: number;
  connection_generation: number;
  connection_id: number;
  metadata: GatewaySessionMetadata;
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
export interface StartupCoordinator {
  connection_id?: number | null;
  endpoint_id?: string | null;
  identity_pending: boolean;
  retry_attempt: number;
  retry_delay_ms: number;
  session_diagnostics: {
    connect_attempt?: SessionDiagnosticTiming;
    credentials_load?: SessionDiagnosticTiming;
    credentials_persist?: SessionDiagnosticTiming;
    identity_verify?: SessionDiagnosticTiming;
    refresh_intent_persist?: SessionDiagnosticTiming;
    refresh_request?: SessionDiagnosticTiming;
  };
  stages: {
    active_thread_bootstrap?: StartupStageState;
    active_thread_subscription?: StartupStageState;
    authorization?: StartupStageState;
    gateway_runtime?: StartupStageState;
    gateway_session?: StartupStageState;
    provider?: StartupStageState;
    thread_capabilities?: StartupStageState;
    thread_tree?: StartupStageState;
    workspace?: StartupStageState;
  };
  transport_ready: boolean;
  transport_revision: number;
  [k: string]: unknown;
}
export interface SessionDiagnosticTiming {
  duration_ms?: number | null;
  endpoint_id: string;
  started_at_unix_ms: number;
  state: StartupStageState;
  [k: string]: unknown;
}
export interface GatewayStatusProjection {
  clear_gateway_error: boolean;
  connection_state: GatewayConnectionState;
  status: GatewayStatusTextUpdate;
  status_level: GatewayStatusLevel;
  [k: string]: unknown;
}

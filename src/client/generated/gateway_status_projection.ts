/* eslint-disable */

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

export interface GatewayStatusProjection {
  clear_gateway_error: boolean;
  connection_state: GatewayConnectionState;
  status: GatewayStatusTextUpdate;
  status_level: GatewayStatusLevel;
  [k: string]: unknown;
}

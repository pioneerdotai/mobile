/* eslint-disable */

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

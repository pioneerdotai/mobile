/* eslint-disable */

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
        address: string;
        endpoint_name: string;
        [k: string]: unknown;
      };
    }
  | {
      LocalStopped: {
        address: string;
        [k: string]: unknown;
      };
    }
  | {
      RemoteUnavailable: {
        address: string;
        endpoint_name: string;
        [k: string]: unknown;
      };
    }
  | {
      LocalConflictAt: {
        address: string;
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

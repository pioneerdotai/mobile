/* eslint-disable */

export type McpDetailValue =
  | 'Empty'
  | {
      Text: string;
    }
  | {
      Timestamp: number;
    }
  | {
      Count: number;
    }
  | {
      Bool: boolean;
    }
  | {
      Status: McpStatusLabel;
    }
  | {
      Source: McpSourceLabel;
    }
  | {
      Scope: McpScopeLabel;
    }
  | {
      Transport: McpTransportPresentation;
    };
export type McpStatusLabel =
  | 'NotStarted'
  | 'Disabled'
  | 'Starting'
  | 'Ready'
  | 'Degraded'
  | 'AuthRequired'
  | 'Failed'
  | 'Stopping'
  | 'Stopped'
  | 'Restarting';
export type McpSourceLabel = 'Config';
export type McpScopeLabel = 'Workspace' | 'User';
export type McpTransportPresentation =
  | {
      Stdio: {
        command: string;
        [k: string]: unknown;
      };
    }
  | {
      StreamableHttp: {
        url: string;
        [k: string]: unknown;
      };
    };

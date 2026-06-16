/* eslint-disable */

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

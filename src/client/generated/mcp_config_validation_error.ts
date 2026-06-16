/* eslint-disable */

export type McpConfigValidationError =
  | ('ServersRequired' | 'ServersEmpty' | 'ServerNameEmpty')
  | {
      InvalidJson: {
        error: string;
        [k: string]: unknown;
      };
    }
  | {
      ServerConfigObject: {
        name: string;
        [k: string]: unknown;
      };
    }
  | {
      CommandOrUrlRequired: {
        name: string;
        [k: string]: unknown;
      };
    }
  | {
      CommandUrlExclusive: {
        name: string;
        [k: string]: unknown;
      };
    };

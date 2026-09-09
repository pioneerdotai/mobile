/* eslint-disable */

export type McpInstallFieldError =
  | {
      ValidationIssues: McpInstallFieldIssue[];
    }
  | {
      Failure: {
        message: string;
        [k: string]: unknown;
      };
    };
export type McpInstallFieldIssue =
  | {
      ServerValidationError: {
        name: string;
        [k: string]: unknown;
      };
    }
  | {
      Diagnostic: {
        field_path?: string | null;
        level: McpDiagnosticLevel;
        message: string;
        name: string;
        [k: string]: unknown;
      };
    };
export type McpDiagnosticLevel = 'error' | 'warning';
export type McpActionKind = 'policy' | 'restart' | 'remove' | 'configure';
export type McpActionState = 'pending' | 'succeeded' | 'failed' | 'cancelled';

export interface McpActionPublication {
  field_error?: McpInstallFieldError | null;
  kind: McpActionKind;
  operation_id: number;
  revision: number;
  state: McpActionState;
  [k: string]: unknown;
}

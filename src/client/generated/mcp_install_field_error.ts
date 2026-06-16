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

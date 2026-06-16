/* eslint-disable */

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

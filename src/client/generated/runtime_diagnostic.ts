/* eslint-disable */

export type RuntimeDiagnosticLevel = 'info' | 'warning' | 'error';

export interface RuntimeDiagnostic {
  code: string;
  level: RuntimeDiagnosticLevel;
  message: string;
  [k: string]: unknown;
}

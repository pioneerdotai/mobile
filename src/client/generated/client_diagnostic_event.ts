/* eslint-disable */

export type ClientDiagnosticLevel = 'breadcrumb' | 'error';

export interface ClientDiagnosticEvent {
  code?: string | null;
  level: ClientDiagnosticLevel;
  message: string;
  operation: string;
  sequence: number;
  unix_ms: number;
}

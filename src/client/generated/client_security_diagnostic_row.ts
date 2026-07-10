/* eslint-disable */

export type TurnSecurityCapabilityKind = 'filesystem' | 'network' | 'process' | 'approval' | 'sandbox_backend';

export interface ClientSecurityDiagnosticRow {
  capability: TurnSecurityCapabilityKind;
  label: string;
  message: string;
  [k: string]: unknown;
}

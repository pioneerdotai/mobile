/* eslint-disable */

export type TurnSecurityCapabilityKind = 'filesystem' | 'network' | 'process' | 'approval' | 'sandbox_backend';
export type ClientSecurityEnforcementStatus = 'active' | 'degraded' | 'unavailable';

export interface ClientSecurityDiagnostic {
  capability: TurnSecurityCapabilityKind;
  message: string;
  status: ClientSecurityEnforcementStatus;
  [k: string]: unknown;
}

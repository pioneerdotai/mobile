/* eslint-disable */

export type GatewayId = string;
export type InvitationTransportSecurity = 'secure_wss' | 'insecure_ws';

export interface ClientInvitationPresentationResult {
  canonical_uri: string;
  gateway_base_url: string;
  gateway_id: GatewayId;
  qr_modules: boolean[];
  qr_payload: string;
  qr_width: number;
  transport_security: InvitationTransportSecurity;
  [k: string]: unknown;
}

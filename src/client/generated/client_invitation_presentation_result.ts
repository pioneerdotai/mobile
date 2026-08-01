/* eslint-disable */

export type GatewayId = string;
export type InvitationTransportSecurity = 'secure_wss' | 'insecure_ws';

export interface ClientInvitationPresentationResult {
  canonical_uri: string;
  gateway_id: GatewayId;
  protected_endpoint: string;
  qr_payload: string;
  transport_security: InvitationTransportSecurity;
  [k: string]: unknown;
}

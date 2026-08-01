/* eslint-disable */

export type RemoteGatewayValidation =
  | {
      gateway_base_url: string;
      state: 'reachable';
      transport_security: GatewayTransportSecurity;
      [k: string]: unknown;
    }
  | {
      gateway_base_url: string;
      state: 'unreachable';
      transport_security: GatewayTransportSecurity;
      [k: string]: unknown;
    };
export type GatewayTransportSecurity = 'loopback_plaintext' | 'remote_plaintext' | 'tls';

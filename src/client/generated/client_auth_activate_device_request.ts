/* eslint-disable */

export type ClientKind = 'desktop' | 'mobile' | 'other';

export interface ClientAuthDeviceActivateRequest {
  credential: string;
  gateway_base_url: string;
  params: AuthDeviceActivateParams;
  timeout_ms?: number;
}
export interface AuthDeviceActivateParams {
  installation: ClientInstallationDescriptor;
}
export interface ClientInstallationDescriptor {
  client_kind: ClientKind;
  client_version?: string | null;
  display_name: string;
  installation_id: string;
  platform?: string | null;
}

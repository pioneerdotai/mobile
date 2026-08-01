/* eslint-disable */

export type ClientKind = 'desktop' | 'mobile' | 'other';
export type ProfileAvatarMediaType = 'image/png' | 'image/jpeg' | 'image/webp';

export interface ClientInvitationAcceptRequest {
  expected_installation_id: string;
  params: InvitationAcceptParams;
  timeout_ms?: number;
  uri: string;
}
export interface InvitationAcceptParams {
  installation: ClientInstallationDescriptor;
  profile: NewMemberProfile;
}
export interface ClientInstallationDescriptor {
  client_kind: ClientKind;
  client_version?: string | null;
  display_name: string;
  installation_id: string;
  platform?: string | null;
}
export interface NewMemberProfile {
  avatar?: ProfileAvatarInput | null;
  display_name: string;
  nickname: string;
}
export interface ProfileAvatarInput {
  content_base64: string;
  media_type: ProfileAvatarMediaType;
}

/* eslint-disable */

export type ProfileAvatarMediaType = 'image/png' | 'image/jpeg' | 'image/webp';
export type PrincipalId = string;

export interface MemberAvatarGetResponse {
  avatar_revision: string;
  content_base64: string;
  media_type: ProfileAvatarMediaType;
  principal_id: PrincipalId;
  [k: string]: unknown;
}

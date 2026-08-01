/* eslint-disable */

export type ProfileAvatarMediaType = 'image/png' | 'image/jpeg' | 'image/webp';

export interface NewMemberProfile {
  avatar?: ProfileAvatarInput | null;
  display_name: string;
  nickname: string;
}
export interface ProfileAvatarInput {
  content_base64: string;
  media_type: ProfileAvatarMediaType;
}

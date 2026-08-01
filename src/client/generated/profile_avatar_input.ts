/* eslint-disable */

export type ProfileAvatarMediaType = 'image/png' | 'image/jpeg' | 'image/webp';

export interface ProfileAvatarInput {
  content_base64: string;
  media_type: ProfileAvatarMediaType;
}

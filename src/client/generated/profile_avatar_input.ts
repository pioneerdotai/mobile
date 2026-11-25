/* eslint-disable */

export type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/webp';

export interface ProfileAvatarInput {
  content_base64: string;
  media_type: ImageMediaType;
}

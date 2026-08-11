/* eslint-disable */

export type ProfileAvatarMediaType = 'image/png' | 'image/jpeg' | 'image/webp';

export interface AuthProfileUpdateParams {
  avatar?:
    | {
        action: 'unchanged';
        [k: string]: unknown;
      }
    | {
        action: 'remove';
        [k: string]: unknown;
      }
    | {
        action: 'set';
        avatar: ProfileAvatarInput;
        [k: string]: unknown;
      };
  display_name: string;
  nickname: string;
}
export interface ProfileAvatarInput {
  content_base64: string;
  media_type: ProfileAvatarMediaType;
}

/* eslint-disable */

export type ProfileAvatarMediaType = 'image/png' | 'image/jpeg' | 'image/webp';
export type PrincipalId = string;
export type AvatarCacheSource = 'downloaded' | 'revalidated' | 'offline_cache';

export interface ClientMemberAvatarCacheResult {
  avatar_revision: string;
  cached_image_path: string;
  media_type: ProfileAvatarMediaType;
  principal_id: PrincipalId;
  source: AvatarCacheSource;
  [k: string]: unknown;
}

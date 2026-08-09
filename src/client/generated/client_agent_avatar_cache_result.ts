/* eslint-disable */

export type ProfileAvatarMediaType = 'image/png' | 'image/jpeg' | 'image/webp';
export type AvatarCacheSource = 'downloaded' | 'revalidated' | 'offline_cache';

export interface ClientAgentAvatarCacheResult {
  avatar_revision: string;
  cached_image_path: string;
  media_type: ProfileAvatarMediaType;
  source: AvatarCacheSource;
  [k: string]: unknown;
}

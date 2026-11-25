/* eslint-disable */

export type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/webp';
export type ImageCacheSource = 'downloaded' | 'revalidated' | 'offline_cache';

export interface ClientAgentAvatarCacheResult {
  avatar_revision: string;
  cached_image_path: string;
  media_type: ImageMediaType;
  source: ImageCacheSource;
  [k: string]: unknown;
}

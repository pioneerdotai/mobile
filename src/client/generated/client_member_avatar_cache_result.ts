/* eslint-disable */

export type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/webp';
export type PrincipalId = string;
export type ImageCacheSource = 'downloaded' | 'revalidated' | 'offline_cache';

export interface ClientMemberAvatarCacheResult {
  avatar_revision: string;
  cached_image_path: string;
  media_type: ImageMediaType;
  principal_id: PrincipalId;
  source: ImageCacheSource;
  [k: string]: unknown;
}

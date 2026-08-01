/* eslint-disable */

export interface ClientMemberAvatarCacheResult {
  avatar_revision: string;
  cached_image_path: string;
  media_type: 'image/png' | 'image/jpeg' | 'image/webp';
  principal_id: string;
  source: 'downloaded' | 'revalidated' | 'offline_cache';
  [k: string]: unknown;
}

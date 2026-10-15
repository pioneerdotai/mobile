/* eslint-disable */

export type AvatarCacheError =
  | 'invalid_request'
  | 'authentication'
  | 'hidden_or_missing'
  | 'offline'
  | 'invalid_response'
  | 'corrupt'
  | 'disk'
  | 'cancelled';
export type ClientPath = string;
export type ProfileAvatarMediaType = 'image/png' | 'image/jpeg' | 'image/webp';
export type AvatarCacheSource = 'downloaded' | 'revalidated' | 'offline_cache';

export interface AvatarPublication {
  avatar_revision: string;
  error?: AvatarCacheError | null;
  local_path?: ClientPath | null;
  media_type?: ProfileAvatarMediaType | null;
  principal_id: string;
  source?: AvatarCacheSource | null;
  [k: string]: unknown;
}

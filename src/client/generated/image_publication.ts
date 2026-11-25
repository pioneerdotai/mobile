/* eslint-disable */

export type ImageCacheError =
  | 'invalid_request'
  | 'authentication'
  | 'hidden_or_missing'
  | 'offline'
  | 'invalid_response'
  | 'corrupt'
  | 'disk'
  | 'cancelled';
export type ClientPath = string;
export type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/webp';
export type ImageCacheSource = 'downloaded' | 'revalidated' | 'offline_cache';

export interface ImagePublication {
  avatar_revision: string;
  error?: ImageCacheError | null;
  local_path?: ClientPath | null;
  media_type?: ImageMediaType | null;
  principal_id: string;
  source?: ImageCacheSource | null;
  [k: string]: unknown;
}

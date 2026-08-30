/* eslint-disable */

export interface ClientThreadFileViewOpenResult {
  column?: number | null;
  content_type: string;
  expires_at: number;
  file_name: string;
  line?: number | null;
  size_bytes: number;
  view_url: string;
  [k: string]: unknown;
}

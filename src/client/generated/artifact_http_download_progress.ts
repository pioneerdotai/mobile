/* eslint-disable */

export interface ArtifactHttpDownloadProgress {
  downloaded_bytes: number;
  resumed_from_bytes: number;
  total_bytes: number;
  [k: string]: unknown;
}

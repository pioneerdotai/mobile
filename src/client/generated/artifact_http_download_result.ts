/* eslint-disable */

export type ClientPath = string;

export interface ArtifactHttpDownloadResult {
  artifact_id: string;
  local_path: ClientPath;
  sha256: string;
  size_bytes: number;
  version_id: string;
  [k: string]: unknown;
}

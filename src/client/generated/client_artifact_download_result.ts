/* eslint-disable */

export interface ClientArtifactDownloadResult {
  artifact_id: string;
  display_name: string;
  local_file_path: string;
  operation_id: string;
  sha256: string;
  size_bytes: number;
  version_id: string;
  [k: string]: unknown;
}

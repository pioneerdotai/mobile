/* eslint-disable */

export interface ArtifactHttpDownloadRequest {
  artifact_id: string;
  display_name: string;
  expected_sha256: string;
  expected_size_bytes: number;
  gateway_profile_id: string;
  version_id: string;
  workspace_id: string;
  [k: string]: unknown;
}

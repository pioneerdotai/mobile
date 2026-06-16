/* eslint-disable */

export interface ArtifactDownloadRequest {
  artifact_id: string;
  gateway_profile_id: string;
  version_id?: string | null;
  workspace_id: string;
  [k: string]: unknown;
}

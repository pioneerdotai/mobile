/* eslint-disable */

export interface ClientArtifactDownloadRequest {
  artifact_id: string;
  operation_id: string;
  version_id?: string | null;
  workspace_id: string;
}

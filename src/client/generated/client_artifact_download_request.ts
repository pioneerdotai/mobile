/* eslint-disable */

export interface ClientArtifactDownloadRequest {
  artifact_id: string;
  identity: ArtifactActionIdentity;
  operation_id: string;
  thread_id?: string | null;
  version_id?: string | null;
  workspace_id: string;
}
export interface ArtifactActionIdentity {
  artifact_id: string;
  generation: number;
  thread_id: string;
  version_id?: string | null;
  [k: string]: unknown;
}

/* eslint-disable */

export interface ClientArtifactTargetRequest {
  artifact_id: string;
  identity: ArtifactActionIdentity;
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

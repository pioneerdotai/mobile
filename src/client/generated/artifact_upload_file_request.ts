/* eslint-disable */

export type ClientPath = string;

export interface ArtifactUploadFileRequest {
  client_attachment_id: string;
  mime_type?: string | null;
  path: ClientPath;
  planned_turn_id?: string | null;
  thread_id?: string | null;
  workspace_id: string;
  [k: string]: unknown;
}

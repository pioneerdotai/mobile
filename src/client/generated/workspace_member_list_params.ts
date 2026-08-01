/* eslint-disable */

export type WorkspaceId = string;

export interface WorkspaceMemberListParams {
  cursor?: string | null;
  limit?: number | null;
  workspace_id: WorkspaceId;
}

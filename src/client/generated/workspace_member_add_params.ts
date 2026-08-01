/* eslint-disable */

export type PrincipalId = string;
export type WorkspaceId = string;

export interface WorkspaceMemberAddParams {
  principal_id: PrincipalId;
  workspace_id: WorkspaceId;
}

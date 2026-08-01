/* eslint-disable */

export type PrincipalId = string;
export type WorkspaceId = string;

export interface WorkspaceMemberRemoveParams {
  principal_id: PrincipalId;
  workspace_id: WorkspaceId;
}

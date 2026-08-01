/* eslint-disable */

export type WorkspaceId = string;

export interface WorkspaceMembersChangedNotification {
  revision: number;
  workspace_id: WorkspaceId;
  [k: string]: unknown;
}

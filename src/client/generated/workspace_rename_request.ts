/* eslint-disable */

export interface WorkspaceRenameRequest {
  action_in_progress?: boolean;
  name: string;
  workspace_id: string;
  workspaces?: Workspace[];
}
export interface Workspace {
  created_at: number;
  id: string;
  is_active: boolean;
  is_current: boolean;
  name: string;
  updated_at: number;
  [k: string]: unknown;
}

/* eslint-disable */

export type WorkspaceCreateResult =
  | {
      reduction: WorkspaceCreateSuccessReduction;
      status: 'created';
      [k: string]: unknown;
    }
  | {
      status: 'empty_name';
      [k: string]: unknown;
    }
  | {
      status: 'busy';
      [k: string]: unknown;
    };

export interface WorkspaceCreateSuccessReduction {
  clear_workspaces_error: boolean;
  switch_workspace_id: string;
  workspace_id: string;
  workspaces: Workspace[];
  [k: string]: unknown;
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

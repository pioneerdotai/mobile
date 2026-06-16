/* eslint-disable */

export type WorkspaceRenameResult =
  | {
      reduction: WorkspaceRenameSuccessReduction;
      status: 'renamed';
      [k: string]: unknown;
    }
  | {
      status: 'empty_name';
      [k: string]: unknown;
    }
  | {
      status: 'busy';
      [k: string]: unknown;
    }
  | {
      status: 'unchanged';
      [k: string]: unknown;
    };

export interface WorkspaceRenameSuccessReduction {
  clear_workspaces_error: boolean;
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

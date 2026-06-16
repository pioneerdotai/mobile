/* eslint-disable */

export type WorkspaceSwitchResult =
  | {
      reduction: WorkspaceSwitchSuccessReduction;
      status: 'switched';
      [k: string]: unknown;
    }
  | {
      status: 'missing_workspace_id';
      [k: string]: unknown;
    }
  | {
      status: 'busy';
      [k: string]: unknown;
    }
  | {
      status: 'noop';
      [k: string]: unknown;
    }
  | {
      status: 'unknown_target';
      workspace_id: string;
      [k: string]: unknown;
    };

export interface WorkspaceSwitchSuccessReduction {
  clear_thread_list_loading: boolean;
  refresh_workspace_bound_screens: boolean;
  selected: WorkspaceSelectionReduction;
  workspaces: Workspace[];
  [k: string]: unknown;
}
export interface WorkspaceSelectionReduction {
  persist_active_gateway_workspace_id: string;
  refresh_thread_list: boolean;
  set_preferred_workspace_id: string;
  workspace_id: string;
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

/* eslint-disable */

export interface WorkspaceBootstrapSuccessReduction {
  clear_workspaces_error: boolean;
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

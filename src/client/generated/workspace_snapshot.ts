/* eslint-disable */

export interface WorkspaceSnapshot {
  action_in_progress: boolean;
  active_workspace_id?: string | null;
  error?: string | null;
  loading: boolean;
  preferred_workspace_id?: string | null;
  workspace_count: number;
  [k: string]: unknown;
}

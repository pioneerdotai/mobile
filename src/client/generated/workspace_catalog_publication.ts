/* eslint-disable */

export type WorkspaceCatalogOperation = 'bootstrap' | 'select' | 'create' | 'rename';

export interface WorkspaceCatalogPublication {
  action_pending: boolean;
  bootstrapped_connection_id?: number | null;
  error?: string | null;
  loading: boolean;
  operation?: WorkspaceCatalogOperation | null;
  revision: number;
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

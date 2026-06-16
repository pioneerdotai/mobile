/* eslint-disable */

export interface ThreadAgentsDocSaveParams {
  content: string;
  expected_version?: number | null;
  folder_id?: string | null;
  save_reason?: 'autosave' | 'manual';
  workspace_id: string;
  [k: string]: unknown;
}

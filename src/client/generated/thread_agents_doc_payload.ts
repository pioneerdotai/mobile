/* eslint-disable */

export type ThreadAgentsDocStatus = 'draft' | 'active' | 'archived';

export interface ThreadAgentsDocPayload {
  content: string;
  content_sha256: string;
  created_at: number;
  folder_id?: string | null;
  id: string;
  status: ThreadAgentsDocStatus;
  title: string;
  updated_at: number;
  version: number;
  workspace_id: string;
  [k: string]: unknown;
}

/* eslint-disable */

export type ThreadAgentsDocStatus = 'draft' | 'active' | 'archived';

export interface ThreadAgentsDocGetResponse {
  effective?: ThreadAgentsDocResolvedPayload | null;
  explicit?: ThreadAgentsDocPayload | null;
  [k: string]: unknown;
}
export interface ThreadAgentsDocResolvedPayload {
  doc: ThreadAgentsDocPayload;
  inherited: boolean;
  resolved_at: number;
  resolved_for_folder_id?: string | null;
  source_folder_id?: string | null;
  source_path?: string[];
  [k: string]: unknown;
}
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

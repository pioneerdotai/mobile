/* eslint-disable */

export type AgentsDocEditorLoadState =
  | {
      kind: 'loading';
      [k: string]: unknown;
    }
  | {
      kind: 'loaded';
      [k: string]: unknown;
    }
  | {
      kind: 'failed';
      value: string;
      [k: string]: unknown;
    };
export type AgentsDocEditorSaveState =
  | {
      kind: 'clean';
      [k: string]: unknown;
    }
  | {
      kind: 'dirty';
      [k: string]: unknown;
    }
  | {
      kind: 'saving';
      [k: string]: unknown;
    }
  | {
      kind: 'saved';
      saved_at: number;
      [k: string]: unknown;
    }
  | {
      kind: 'error';
      message: string;
      [k: string]: unknown;
    }
  | {
      kind: 'conflict';
      local_content: string;
      remote_doc: ThreadAgentsDocPayload;
      [k: string]: unknown;
    };
export type ThreadAgentsDocStatus = 'draft' | 'active' | 'archived';
export type AgentsDocEditorScope =
  | {
      kind: 'root';
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      folder_id: string;
      kind: 'folder';
      workspace_id: string;
      [k: string]: unknown;
    };

export interface AgentsDocumentPublication {
  access: boolean;
  close_ready: boolean;
  content: string;
  edit_revision: number;
  load: AgentsDocEditorLoadState;
  owner_generation: number;
  revision: number;
  save: AgentsDocEditorSaveState;
  scope: AgentsDocEditorScope;
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

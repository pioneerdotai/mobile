/* eslint-disable */

export type ClientScope =
  | {
      kind: 'session';
      [k: string]: unknown;
    }
  | {
      kind: 'navigation';
      [k: string]: unknown;
    }
  | {
      kind: 'sidebar_summary';
      thread_id: string;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'workspace_tree';
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'task_inbox';
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'task';
      task_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'thread';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'timeline';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'composer';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'thread_member';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'thread_capability';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'turn_cancellation';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'composer_model_picker';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'composer_catalog';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'message_deletion';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'message_revisions';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'approval_action';
      request_id: string;
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      candidate_id: string;
      kind: 'task_review';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'pending_request';
      thread_id?: string | null;
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'artifact';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'avatar';
      principal_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'administration_operation';
      [k: string]: unknown;
    }
  | {
      kind: 'administration_page';
      page: AdministrationPage;
      [k: string]: unknown;
    }
  | {
      kind: 'provider';
      [k: string]: unknown;
    }
  | {
      kind: 'provider_operation';
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      key: ProviderCollectionKey;
      kind: 'provider_collection';
      [k: string]: unknown;
    }
  | {
      kind: 'provider_runtime';
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'administration';
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'mcp';
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'skills_details';
      skill_id: SkillId;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'mcp_action';
      target: string;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'skills_action';
      target: string;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'skills_upload';
      operation_id: number;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'mcp_details';
      server_id: string;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'skills';
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'settings';
      [k: string]: unknown;
    }
  | {
      kind: 'onboarding_invitation';
      [k: string]: unknown;
    }
  | {
      kind: 'agents_document';
      workspace_id: string;
      [k: string]: unknown;
    };
export type AdministrationPage =
  | {
      kind: 'members';
      [k: string]: unknown;
    }
  | {
      kind: 'member_directory';
      [k: string]: unknown;
    }
  | {
      kind: 'invitations';
      [k: string]: unknown;
    }
  | {
      kind: 'workspace_members';
      workspace_id: WorkspaceId;
      [k: string]: unknown;
    };
export type WorkspaceId = string;
export type ProviderCollection =
  | {
      kind: 'catalog';
      [k: string]: unknown;
    }
  | {
      kind: 'models';
      provider: string;
      purpose: ProviderModelKind;
      [k: string]: unknown;
    };
export type ProviderModelKind = 'chat' | 'embeddings' | 'transcription';
export type SkillId = string;

export interface ProviderCollectionKey {
  collection: ProviderCollection;
  workspace_id: string;
  [k: string]: unknown;
}

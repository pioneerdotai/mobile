/* eslint-disable */

export type ClientDomainIdentity =
  | {
      kind: 'thread_id';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'row_id';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'work_item_id';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'workspace_id';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'provider_id';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'runtime_id';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'model_id';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'server_id';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'skill_id';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'principal_id';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'request_id';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'session_id';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'invitation_id';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'artifact_version_id';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'activity_id';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'notification_id';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'generated_attachment_id';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'markdown_node_id';
      value: string;
      [k: string]: unknown;
    };
export type ClientFeature =
  | 'session'
  | 'navigation'
  | 'workspace_tree'
  | 'task'
  | 'thread'
  | 'timeline'
  | 'composer'
  | 'pending_request'
  | 'artifact'
  | 'avatar'
  | 'provider'
  | 'administration'
  | 'mcp'
  | 'skills'
  | 'settings'
  | 'onboarding_invitation'
  | 'agents_document'
  | 'desktop_update';
export type ClientControlRole =
  'surface' | 'row' | 'button' | 'input' | 'menu_item' | 'tab' | 'dialog' | 'activity' | 'attachment' | 'markdown_node';

export interface ClientIdentity {
  domain: ClientDomainIdentity;
  namespace: ClientIdentityNamespace;
  occurrence?: number | null;
  parent?: ClientDomainIdentity | null;
  role: ClientControlRole;
  [k: string]: unknown;
}
export interface ClientIdentityNamespace {
  feature: ClientFeature;
  list?: string | null;
  [k: string]: unknown;
}

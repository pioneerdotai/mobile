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

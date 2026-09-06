/* eslint-disable */

export type ClientIntent =
  | {
      kind: 'refresh_timeline';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      collapsed_row_ids: string[];
      kind: 'set_timeline_expansion';
      row_ids: string[];
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      after: boolean;
      before: boolean;
      kind: 'timeline_viewport';
      presented_rows: boolean;
      row_ids: string[];
      source_revision: number;
      thread_id: string;
      threshold: number;
      work: boolean;
      [k: string]: unknown;
    }
  | {
      demand: ClientDemand;
      generation: number;
      kind: 'set_scope_demand';
      scope: ClientScope;
      [k: string]: unknown;
    };
export type ClientDemand = 'suspended' | 'visible' | 'prefetch';
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
      kind: 'provider';
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
    }
  | {
      kind: 'desktop_update';
      [k: string]: unknown;
    };

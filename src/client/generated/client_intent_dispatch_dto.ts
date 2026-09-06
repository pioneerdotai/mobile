/* eslint-disable */

export type ClientIntent =
  | {
      expected_revision?: number | null;
      intent: NavigationIntent;
      kind: 'navigation';
      [k: string]: unknown;
    }
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
export type NavigationIntent =
  | {
      kind: 'set_administration_route';
      route: AdministrationRoute;
      [k: string]: unknown;
    }
  | {
      kind: 'set_settings_route';
      route: SettingsRoute;
      [k: string]: unknown;
    }
  | {
      filter: ProviderFilter;
      kind: 'set_providers_route';
      [k: string]: unknown;
    }
  | {
      kind: 'set_mcp_route';
      server_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'set_skills_route';
      skill_id?: SkillId | null;
      [k: string]: unknown;
    }
  | {
      kind: 'select_workspace';
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'select_thread';
      thread_id?: string | null;
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      destination: SemanticDestination;
      kind: 'navigate';
      [k: string]: unknown;
    }
  | {
      kind: 'remember_draft';
      thread_id?: string | null;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'remember_last';
      thread_id?: string | null;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'promote_thread';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      entry: TaskThreadLineage;
      kind: 'push_task_thread';
      [k: string]: unknown;
    }
  | {
      kind: 'pop_task_thread';
      [k: string]: unknown;
    }
  | {
      kind: 'clear_lineage';
      [k: string]: unknown;
    }
  | {
      kind: 'reset';
      [k: string]: unknown;
    };
export type AdministrationRoute = 'Members' | 'Invitations';
export type SettingsRoute = 'General' | 'Account' | 'Memory' | 'SelfImprovement';
export type ProviderFilter = 'Api' | 'Connected' | 'Cli';
export type SkillId = string;
export type SemanticDestination =
  | {
      kind: 'threads';
      [k: string]: unknown;
    }
  | {
      kind: 'agents_document';
      [k: string]: unknown;
    }
  | {
      filter: ProviderFilter;
      kind: 'providers';
      [k: string]: unknown;
    }
  | {
      kind: 'administration';
      route: AdministrationRoute;
      [k: string]: unknown;
    }
  | {
      kind: 'mcp';
      server_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'skills';
      skill_id?: SkillId | null;
      [k: string]: unknown;
    }
  | {
      kind: 'settings';
      route: SettingsRoute;
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

export interface ClientIntentDispatchDto {
  intent: ClientIntent;
  schema_version: number;
}
export interface TaskThreadLineage {
  child_thread_id: string;
  parent_thread_id: string;
  title: string;
  workspace_id: string;
  [k: string]: unknown;
}

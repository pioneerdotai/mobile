/* eslint-disable */

export type NavigationIntent =
  | {
      kind: 'open_agents_document';
      scope: AgentsDocEditorScope;
      [k: string]: unknown;
    }
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

export interface TaskThreadLineage {
  child_thread_id: string;
  parent_thread_id: string;
  title: string;
  workspace_id: string;
  [k: string]: unknown;
}

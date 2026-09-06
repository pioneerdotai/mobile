/* eslint-disable */

export type AdministrationRoute = 'Members' | 'Invitations';
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
export type ProviderFilter = 'Api' | 'Connected' | 'Cli';
export type SkillId = string;
export type SettingsRoute = 'General' | 'Account' | 'Memory' | 'SelfImprovement';

export interface ClientNavigationState {
  active_thread_id?: string | null;
  administration: AdministrationRoute;
  destination: SemanticDestination;
  drafts: {
    [k: string]: string;
  };
  last_active: {
    [k: string]: string;
  };
  lineage: TaskThreadLineage[];
  mcp_server_id?: string | null;
  providers?: ProviderFilter | null;
  settings: SettingsRoute;
  skill_id?: SkillId | null;
  workspace_id?: string | null;
  [k: string]: unknown;
}
export interface TaskThreadLineage {
  child_thread_id: string;
  parent_thread_id: string;
  title: string;
  workspace_id: string;
  [k: string]: unknown;
}

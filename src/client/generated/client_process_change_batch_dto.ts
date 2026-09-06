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
export type ClientPlannedEffect = ClientEffect | GatewaySessionStorageEffect;
export type ClientEffect =
  | (
      | 'RefreshWorkspaceList'
      | 'RefreshGatewaySettings'
      | 'RefreshProviderLists'
      | 'QueueSkillsRefresh'
      | 'EnqueueInFlightTurnsForResume'
    )
  | {
      UnsubscribeThreads: {
        thread_ids: string[];
        [k: string]: unknown;
      };
    };
export type GatewaySessionStorageEffect =
  | {
      ReadGatewaySession: {
        endpoint: GatewayEndpoint;
        [k: string]: unknown;
      };
    }
  | {
      PersistGatewaySession: {
        endpoint: GatewayEndpoint;
        envelope: GatewaySessionEnvelope;
        [k: string]: unknown;
      };
    };
export type GatewayEndpointKind = 'local' | 'remote';
export type GatewayId = string;
export type DeviceId = string;
export type PrincipalId = string;
export type AuthSessionId = string;
export type TokenFamilyId = string;

export interface ClientProcessChangeBatchDto {
  changes: ClientProcessChangeSetDto[];
  closed: boolean;
  effects: ClientEffectPlan[];
  resnapshot: boolean;
  schema_version: number;
  sequence: number;
  [k: string]: unknown;
}
export interface ClientProcessChangeSetDto {
  predecessor?: number | null;
  sequence: number;
  snapshots: ClientScopedSnapshotDto[];
  [k: string]: unknown;
}
export interface ClientScopedSnapshotDto {
  payload: unknown;
  revisions: ClientRevisions;
  schema_version: number;
  scope: ClientScope;
  sequence: number;
  [k: string]: unknown;
}
export interface ClientRevisions {
  content: number;
  domain: number;
  presentation: number;
  scoped: number;
  [k: string]: unknown;
}
export interface ClientEffectPlan {
  effect: ClientPlannedEffect;
  generation: number;
  operation_id: string;
  [k: string]: unknown;
}
export interface GatewayEndpoint {
  gateway_base_url: string;
  id: string;
  kind: GatewayEndpointKind;
  name: string;
  server_gateway_id?: GatewayId | null;
  service_name?: string | null;
  session_ref?: string | null;
  workspace_id?: string | null;
}
export interface GatewaySessionEnvelope {
  device_id: DeviceId;
  gateway_id: GatewayId;
  installation_id: string;
  pending_refresh_request_id?: string | null;
  principal_id: PrincipalId;
  refresh_expires_at_unix: number;
  refresh_generation: number;
  refresh_token: string;
  schema_version: number;
  session_id: AuthSessionId;
  token_family_id: TokenFamilyId;
}

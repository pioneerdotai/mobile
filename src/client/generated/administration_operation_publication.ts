/* eslint-disable */

export type AdministrationAction =
  | {
      kind: 'set_member_workspaces';
      principal_id: PrincipalId;
      [k: string]: unknown;
    }
  | {
      kind: 'create_invitation';
      [k: string]: unknown;
    }
  | {
      invitation_id: InvitationId;
      kind: 'revoke_invitation';
      [k: string]: unknown;
    }
  | {
      kind: 'suspend_member';
      principal_id: PrincipalId;
      [k: string]: unknown;
    }
  | {
      kind: 'restore_member';
      principal_id: PrincipalId;
      [k: string]: unknown;
    }
  | {
      kind: 'remove_member';
      principal_id: PrincipalId;
      [k: string]: unknown;
    }
  | {
      kind: 'create_recovery_device';
      principal_id: PrincipalId;
      [k: string]: unknown;
    }
  | {
      kind: 'add_workspace_member';
      principal_id: PrincipalId;
      workspace_id: WorkspaceId;
      [k: string]: unknown;
    }
  | {
      kind: 'remove_workspace_member';
      principal_id: PrincipalId;
      workspace_id: WorkspaceId;
      [k: string]: unknown;
    };
export type PrincipalId = string;
export type InvitationId = string;
export type WorkspaceId = string;
export type AdministrationLoadState =
  | {
      kind: 'idle';
      [k: string]: unknown;
    }
  | {
      kind: 'loading';
      [k: string]: unknown;
    }
  | {
      kind: 'ready';
      [k: string]: unknown;
    }
  | {
      kind: 'failed';
      [k: string]: unknown;
    }
  | {
      kind: 'forbidden';
      [k: string]: unknown;
    }
  | {
      kind: 'cancelled';
      [k: string]: unknown;
    };

export interface AdministrationOperationPublication {
  action?: AdministrationAction | null;
  generation: number;
  request: AdministrationLoadState;
  revision: number;
  [k: string]: unknown;
}

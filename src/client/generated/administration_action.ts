/* eslint-disable */

export type AdministrationAction =
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
export type InvitationId = string;
export type PrincipalId = string;
export type WorkspaceId = string;

/* eslint-disable */

export type AdministrationRefetch =
  | {
      kind: 'invitation_list';
      [k: string]: unknown;
    }
  | {
      kind: 'member_directory';
      [k: string]: unknown;
    }
  | {
      kind: 'workspace_members';
      workspace_id: WorkspaceId;
      [k: string]: unknown;
    };
export type WorkspaceId = string;

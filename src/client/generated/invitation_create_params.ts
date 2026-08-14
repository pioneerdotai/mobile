/* eslint-disable */

export type RoleKey = string;
export type WorkspaceId = string;

export interface InvitationCreateParams {
  role_key: RoleKey;
  /**
   * @minItems 1
   * @maxItems 64
   */
  workspace_ids: [WorkspaceId, ...WorkspaceId[]];
}

/* eslint-disable */

export type WorkspaceId = string;

export interface InvitationCreateParams {
  /**
   * @minItems 1
   * @maxItems 64
   */
  workspace_ids: [WorkspaceId, ...WorkspaceId[]];
}

/* eslint-disable */

export interface WorkspacePushParams {
  epoch: string;
  inbox: boolean;
  /**
   * Existing exact keyset frontier; recovery preserves this loaded range.
   */
  inboxCursor?: string | null;
  /**
   * Loaded inbox identities, used to reconcile membership at bootstrap.
   */
  runIds?: string[];
  /**
   * Known metadata identities; indicators never discover or create threads.
   */
  threadIds?: string[];
  tree: boolean;
  workspaceId: string;
  [k: string]: unknown;
}

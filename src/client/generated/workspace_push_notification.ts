/* eslint-disable */

export type TaskRunStatus =
  | 'queued'
  | 'starting'
  | 'running'
  | 'waiting'
  | 'waiting_review'
  | 'succeeded'
  | 'failed'
  | 'blocked'
  | 'cancelled'
  | 'timed_out';

export interface WorkspacePushNotification {
  epoch: string;
  inbox?: TaskInboxPatch | null;
  indicators: ThreadIndicatorPatch[];
  resyncRequired: boolean;
  revision: number;
  snapshot: boolean;
  workspaceId: string;
  [k: string]: unknown;
}
export interface TaskInboxPatch {
  /**
   * Authoritative keyset frontier when snapshot or replace is true.
   */
  nextCursor?: string | null;
  removes: string[];
  /**
   * Authoritative inbox replacement, also used by a read-all mutation ack.
   */
  replace?: boolean;
  unreadCount: number;
  upserts: TaskCompletionInboxEntry[];
  [k: string]: unknown;
}
/**
 * One saved terminal run in the current user's workspace inbox. Contains no
 * execution-thread identity, raw failure, HTML, or full result payload.
 */
export interface TaskCompletionInboxEntry {
  completedAt: number;
  /**
   * Exact server keyset ordering key. Empty only for legacy servers.
   */
  completedKey?: string;
  error?: string | null;
  readAt?: number | null;
  runId: string;
  status: TaskRunStatus;
  summary?: string | null;
  taskId: string;
  threadId: string;
  threadTitle: string;
  title: string;
  workspaceId: string;
  [k: string]: unknown;
}
export interface ThreadIndicatorPatch {
  hasRunningTasks?: boolean | null;
  threadId: string;
  unreadCount?: number | null;
  [k: string]: unknown;
}

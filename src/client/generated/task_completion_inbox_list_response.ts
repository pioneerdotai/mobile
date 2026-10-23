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

export interface TaskCompletionInboxListResponse {
  entries: TaskCompletionInboxEntry[];
  nextCursor?: string | null;
  unreadCount: number;
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

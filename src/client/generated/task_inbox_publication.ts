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

export interface TaskInboxPublication {
  error?: string | null;
  items: TaskInboxItem[];
  loading: boolean;
  native_notifications: TaskNotificationEffect[];
  next_cursor?: string | null;
  opened?: TaskNotificationPublication | null;
  revision: number;
  unread_count: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface TaskInboxItem {
  dismissing: boolean;
  notification: TaskCompletionInboxEntry;
  revision: number;
  [k: string]: unknown;
}
/**
 * One saved terminal run in the current user's workspace inbox. Contains no
 * execution-thread identity, raw failure, HTML, or full result payload.
 */
export interface TaskCompletionInboxEntry {
  completedAt: number;
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
export interface TaskNotificationEffect {
  notification_id: string;
  revision: number;
  task_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface TaskNotificationPublication {
  notification_id: string;
  operation_id: number;
  task_id: string;
  task_revision: number;
  thread_id: string;
  [k: string]: unknown;
}

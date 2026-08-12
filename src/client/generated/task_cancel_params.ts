/* eslint-disable */

export interface TaskCancelParams {
  reason?: string | null;
  scope?: 'task_only' | 'attached_subtree' | 'full_subtree';
  taskId: string;
  [k: string]: unknown;
}

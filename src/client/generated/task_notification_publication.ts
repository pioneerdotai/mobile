/* eslint-disable */

export interface TaskNotificationPublication {
  notification_id: string;
  operation_id: number;
  task_id: string;
  task_revision: number;
  thread_id: string;
  [k: string]: unknown;
}

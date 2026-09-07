/* eslint-disable */

export type TaskNotificationIntent =
  | {
      kind: 'refresh';
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'dismiss';
      notification_id: string;
      revision: number;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'retry';
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'open';
      notification_id: string;
      revision: number;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      completion: TaskNotificationCompletion;
      effect: TaskNotificationEffect;
      kind: 'native_completion';
      workspace_id: string;
      [k: string]: unknown;
    };
export type TaskNotificationCompletion = 'activated' | 'dismissed';

export interface TaskNotificationEffect {
  notification_id: string;
  revision: number;
  task_id: string;
  workspace_id: string;
  [k: string]: unknown;
}

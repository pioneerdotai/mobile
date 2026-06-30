/* eslint-disable */

export type SystemEventLabel =
  | (
      | 'Timeout'
      | 'Recovery'
      | 'Retry'
      | 'Recovered'
      | 'Error'
      | 'RetryResolved'
      | 'RetriesExhausted'
      | 'Checkpoint'
      | 'Continued'
      | 'Paused'
      | 'Permissions'
    )
  | {
      Level: SystemEventLevel;
    }
  | {
      Attempt: {
        attempt: number;
        [k: string]: unknown;
      };
    }
  | {
      ExecutionWindow: {
        window_index?: number | null;
        [k: string]: unknown;
      };
    };
export type SystemEventLevel = 'info' | 'warning' | 'error';
export type SystemEventMessage =
  | (
      | 'RecoveryOpened'
      | 'RecoveryAttached'
      | 'RetryScheduled'
      | 'RetryStarted'
      | 'RecoverySucceeded'
      | 'RecoveryFailed'
      | 'ToolLoopBudgetExceeded'
    )
  | {
      Raw: string;
    }
  | {
      Timeout: {
        recovery_started: boolean;
        [k: string]: unknown;
      };
    }
  | {
      ToolRetryScheduled: {
        tool_name: string;
        [k: string]: unknown;
      };
    }
  | {
      ToolRetryResolved: {
        tool_name: string;
        [k: string]: unknown;
      };
    }
  | {
      ToolRetryExhausted: {
        tool_name: string;
        [k: string]: unknown;
      };
    };

export interface SystemEventPresentation {
  label: SystemEventLabel;
  message: SystemEventMessage;
  [k: string]: unknown;
}

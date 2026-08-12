/* eslint-disable */

export type TaskErrorClass =
  'cancelled' | 'timeout' | 'provider' | 'tool' | 'validation' | 'dependency' | 'policy' | 'internal' | 'unknown';
export type TaskValue =
  | {
      kind: 'null';
      [k: string]: unknown;
    }
  | {
      kind: 'bool';
      value: boolean;
      [k: string]: unknown;
    }
  | {
      kind: 'integer';
      value: number;
      [k: string]: unknown;
    }
  | {
      kind: 'number';
      value: number;
      [k: string]: unknown;
    }
  | {
      kind: 'string';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'list';
      value: TaskValue[];
      [k: string]: unknown;
    }
  | {
      kind: 'object';
      value: {
        [k: string]: TaskValue;
      };
      [k: string]: unknown;
    };
export type TaskDeliveryMode = 'none' | 'owner_thread' | 'thread' | 'user_notification' | 'webhook';
export type TaskDeliveryStatus = 'pending' | 'delivering' | 'delivered' | 'failed' | 'cancelled';
export type TaskExecutorKind = 'agent' | 'tool' | 'workflow' | 'webhook' | 'system';
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
export type TaskConcurrencyConflictPolicy = 'queue' | 'reject' | 'cancel_existing' | 'allow';
export type TaskDeliveryFormat = 'summary' | 'full_result';
export type TaskAttachmentMode = 'attached' | 'detached';
export type TaskCompletionBehavior = 'complete_on_terminal_run' | 'keep_active_for_recurring' | 'manual';
export type TaskParentTerminalAction = 'cancel' | 'detach' | 'keep_running';
export type TurnCapabilityKind =
  | {
      packId?: SkillPackId | null;
      skillId: SkillId;
      type: 'skill';
      [k: string]: unknown;
    }
  | {
      packId: SkillPackId;
      type: 'skillPack';
      [k: string]: unknown;
    }
  | {
      name: string;
      scopeKind: McpScopeKind;
      type: 'mcpServer';
      [k: string]: unknown;
    }
  | {
      rawToolName: string;
      scopeKind: McpScopeKind;
      serverName: string;
      type: 'mcpTool';
      [k: string]: unknown;
    };
export type SkillPackId = string;
export type SkillId = string;
export type McpScopeKind = 'workspace' | 'user';
export type AgentExecutionBackend =
  | {
      provider: string;
      type: 'apiProvider';
      [k: string]: unknown;
    }
  | {
      runtime_id: string;
      runtime_kind: CLIAgentRuntimeKind;
      type: 'cliAgentRuntime';
      [k: string]: unknown;
    }
  | {
      runtime_id: string;
      type: 'acpAgentRuntime';
      [k: string]: unknown;
    };
export type CLIAgentRuntimeKind = 'codex' | 'claude';
export type UserInput =
  | {
      text: string;
      textElements?: TextElement[];
      type: 'text';
      [k: string]: unknown;
    }
  | {
      type: 'image';
      url: string;
      [k: string]: unknown;
    }
  | {
      path: string;
      type: 'localImage';
      [k: string]: unknown;
    }
  | {
      type: 'file';
      url: string;
      [k: string]: unknown;
    }
  | {
      path: string;
      type: 'localFile';
      [k: string]: unknown;
    }
  | {
      type: 'audio';
      url: string;
      [k: string]: unknown;
    }
  | {
      path: string;
      type: 'localAudio';
      [k: string]: unknown;
    }
  | {
      type: 'video';
      url: string;
      [k: string]: unknown;
    }
  | {
      path: string;
      type: 'localVideo';
      [k: string]: unknown;
    }
  | {
      artifactId: string;
      type: 'artifact';
      versionId?: string | null;
      [k: string]: unknown;
    }
  | {
      name: string;
      path: string;
      type: 'mention';
      [k: string]: unknown;
    };
export type PrincipalId = string;
export type ThreadMode = ('Message' | 'Agent') | 'Chat';
export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';
export type SandboxMode = 'FullAccess';
export type TaskOwnerKind = 'user' | 'thread' | 'workspace' | 'system';
export type TaskRetryBackoffKind = 'none' | 'fixed' | 'exponential';
export type TaskStatus =
  | 'draft'
  | 'scheduled'
  | 'queued'
  | 'running'
  | 'waiting'
  | 'waiting_review'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'cancelled';

export interface TaskCancelResponse {
  cancelledDeliveries?: TaskDelivery[];
  cancelledRuns?: TaskRun[];
  cancelledTasks?: Task[];
  detachedTasks?: Task[];
  keptTasks?: Task[];
  task: Task;
  [k: string]: unknown;
}
export interface TaskDelivery {
  attemptCount: number;
  createdAt: number;
  deliveredAt?: number | null;
  deliveredNotificationId?: string | null;
  deliveredTurnId?: string | null;
  deliveryKey: string;
  errorSnapshot?: TaskError | null;
  id: string;
  lastError?: string | null;
  maxAttempts: number;
  mode: TaskDeliveryMode;
  nextAttemptAt?: number | null;
  resultSnapshot?: TaskResult | null;
  runId: string;
  status: TaskDeliveryStatus;
  targetThreadId?: string | null;
  targetUserId?: string | null;
  taskId: string;
  updatedAt: number;
  webhookUrl?: string | null;
  webhookUrlFingerprint?: string | null;
  workspaceId: string;
  [k: string]: unknown;
}
export interface TaskError {
  class: TaskErrorClass;
  code: string;
  details?: TaskValue | null;
  failedRunId?: string | null;
  message: string;
  [k: string]: unknown;
}
export interface TaskResult {
  artifacts?: TaskArtifact[];
  completedByRunId?: string | null;
  data?: TaskValue | null;
  summary?: string | null;
  [k: string]: unknown;
}
export interface TaskArtifact {
  artifactId?: string | null;
  metadata?: TaskValue | null;
  mimeType?: string | null;
  path?: string | null;
  url?: string | null;
  versionId?: string | null;
  [k: string]: unknown;
}
export interface TaskRun {
  attemptNumber: number;
  completedAt?: number | null;
  createdAt: number;
  error?: TaskError | null;
  executorKind: TaskExecutorKind;
  heartbeatAt?: number | null;
  id: string;
  lockExpiresAt?: number | null;
  lockedBy?: string | null;
  parentRunId?: string | null;
  readyAt?: number | null;
  result?: TaskResult | null;
  retryOfRunId?: string | null;
  runGroupId: string;
  runNumber: number;
  startedAt?: number | null;
  status: TaskRunStatus;
  taskId: string;
  triggerId?: string | null;
  updatedAt: number;
  [k: string]: unknown;
}
export interface Task {
  completedAt?: number | null;
  concurrencyPolicy?: TaskConcurrencyPolicy | null;
  createdAt: number;
  createdByThreadId?: string | null;
  createdByTurnId?: string | null;
  deliveryPolicy?: TaskDeliveryPolicy | null;
  error?: TaskError | null;
  executorKind: TaskExecutorKind;
  goal: string;
  id: string;
  lifecyclePolicy?: TaskLifecyclePolicy | null;
  metadata?: TaskMetadata | null;
  ownerId?: string | null;
  ownerKind: TaskOwnerKind;
  parentTaskId?: string | null;
  priority: number;
  result?: TaskResult | null;
  retryPolicy?: TaskRetryPolicy | null;
  revision: number;
  rootTaskId?: string | null;
  status: TaskStatus;
  timeoutPolicy?: TaskTimeoutPolicy | null;
  title: string;
  updatedAt: number;
  workspaceId: string;
  [k: string]: unknown;
}
export interface TaskConcurrencyPolicy {
  key?: string | null;
  maxParallelRuns: number;
  onConflict: TaskConcurrencyConflictPolicy;
  [k: string]: unknown;
}
export interface TaskDeliveryPolicy {
  format: TaskDeliveryFormat;
  includeResult: boolean;
  mode: TaskDeliveryMode;
  threadId?: string | null;
  webhookUrl?: string | null;
  [k: string]: unknown;
}
export interface TaskLifecyclePolicy {
  attachment: TaskAttachmentMode;
  completion: TaskCompletionBehavior;
  onParentCancel: TaskParentTerminalAction;
  onParentFailure: TaskParentTerminalAction;
  [k: string]: unknown;
}
export interface TaskMetadata {
  composerWork?: TaskComposerWork | null;
  data?: TaskValue | null;
  labels?: string[];
  [k: string]: unknown;
}
export interface TaskComposerWork {
  launch: TurnStartParams;
  version: number;
  [k: string]: unknown;
}
export interface TurnStartParams {
  capabilities?: TurnCapability[];
  cli_runtime_options?: TurnCLIRuntimeOptions | null;
  execution_backend?: AgentExecutionBackend | null;
  input?: UserInput[];
  mentioned_principal_ids?: PrincipalId[];
  mode?: ThreadMode | null;
  model?: string | null;
  model_provider?: string | null;
  permission_profile?: TurnPermissionProfileSelection | null;
  reasoning?: TurnReasoningSelection | null;
  reply_to_turn_id?: string | null;
  sandbox_policy?: SandboxPolicy | null;
  thread_id: string;
  turn_id: string;
  [k: string]: unknown;
}
export interface TurnCapability {
  id: string;
  kind: TurnCapabilityKind;
  label?: string | null;
  [k: string]: unknown;
}
export interface TurnCLIRuntimeOptions {
  effort?: string | null;
  personality?: string | null;
  sandbox?: unknown;
  steer_if_active?: boolean | null;
  summary?: string | null;
  [k: string]: unknown;
}
export interface TextElement {
  byte_range: ByteRange;
  placeholder?: string | null;
  [k: string]: unknown;
}
export interface ByteRange {
  end: number;
  start: number;
  [k: string]: unknown;
}
export interface TurnPermissionProfileSelection {
  mode: TurnPermissionMode;
  [k: string]: unknown;
}
export interface TurnReasoningSelection {
  /**
   * String-valued because CLI runtimes may advertise efforts newer than
   * Pioneer API-provider adapters understand.
   */
  effort: string;
  [k: string]: unknown;
}
export interface SandboxPolicy {
  mode: SandboxMode;
  [k: string]: unknown;
}
export interface TaskRetryPolicy {
  backoff: TaskRetryBackoffKind;
  initialDelaySeconds?: number | null;
  maxAttempts: number;
  maxDelaySeconds?: number | null;
  retryOn?: TaskErrorClass[];
  [k: string]: unknown;
}
export interface TaskTimeoutPolicy {
  heartbeatTimeoutSeconds?: number | null;
  queueTimeoutSeconds?: number | null;
  runTimeoutSeconds?: number | null;
  [k: string]: unknown;
}

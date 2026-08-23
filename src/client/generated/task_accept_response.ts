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
export type TaskResultCandidateStatus =
  'pending_review' | 'accepted' | 'rejected' | 'superseded' | 'extraction_failed' | 'cancelled';
export type TaskResultReviewDecision = 'accept' | 'request_changes' | 'reject' | 'abstain' | 'cancel';
export type TaskResultReviewEventKind = 'advisory' | 'decision' | 'override' | 'system_auto';
export type PrincipalId = string;
export type AgentExecutionId = string;
export type TaskResultReviewerKind = 'runtime_auto' | 'parent_agent' | 'review_agent' | 'user' | 'system';
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
export type TaskConcurrencyConflictPolicy = 'queue' | 'reject' | 'cancel_existing' | 'allow';
export type TaskDeliveryFormat = 'summary' | 'full_result';
export type TaskDeliveryMode = 'none' | 'thread' | 'user_notification' | 'webhook';
/**
 * Semantic thread target resolved and persisted by Gateway.
 */
export type TaskDeliveryThreadTarget = 'origin_thread' | 'current_thread' | 'collaboration_root' | 'exact_thread';
export type TaskAttachmentMode = 'attached' | 'detached';
export type TaskCompletionBehavior = 'complete_on_terminal_run' | 'keep_active_for_recurring' | 'manual';
export type TaskParentTerminalAction = 'cancel' | 'detach' | 'keep_running';
export type AgentRouteAction =
  'send_message' | 'start_agent' | 'create_task' | 'schedule_task' | 'review_task_result' | 'deliver_result';
export type AgentIdentityId = string;
export type AgentExecutionProfileId = string;
export type AgentDelegationRouteId = string;
export type AgentIdentitySelection =
  | ('inherit_parent' | 'default_pioneer')
  | {
      exact: {
        agent_identity_id: AgentIdentityId;
      };
    }
  | {
      server_derived_ephemeral: {
        display_name_hint?: string | null;
        role_label?: string | null;
      };
    };
export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';
export type AgentExecutionProfileSelection =
  | 'inherit_parent'
  | {
      exact: {
        profile_id: AgentExecutionProfileId;
      };
    };
export type SkillId = string;
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
export type ThreadMode = ('Message' | 'Agent') | 'Chat';
export type SandboxMode = 'FullAccess';
export type TaskOwnerKind = 'user' | 'thread' | 'workspace' | 'system';
export type TaskRetryBackoffKind = 'none' | 'fixed' | 'exponential';

export interface TaskAcceptResponse {
  accepted: boolean;
  alreadyAccepted: boolean;
  candidate: TaskResultCandidate;
  childThreadId?: string | null;
  childTurnId?: string | null;
  result: TaskResult;
  reviewEvent: TaskResultReviewEvent;
  run: TaskRun;
  status: TaskStatus;
  task: Task;
  [k: string]: unknown;
}
export interface TaskResultCandidate {
  createdAt: number;
  diagnostics?: string[];
  extractionError?: TaskError | null;
  finalReviewEventId?: string | null;
  id: string;
  resolvedAt?: number | null;
  result?: TaskResult | null;
  round: number;
  runId: string;
  status: TaskResultCandidateStatus;
  summary?: string | null;
  taskId: string;
  taskRunTurnId: string;
  threadId: string;
  turnId: string;
  updatedAt: number;
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
export interface TaskResultReviewEvent {
  candidateId: string;
  confidence?: number | null;
  createdAt: number;
  decision: TaskResultReviewDecision;
  eventKind: TaskResultReviewEventKind;
  feedback?: TaskValue | null;
  feedbackText?: string | null;
  id: string;
  nextTaskRunTurnId?: string | null;
  /**
   * Exact durable reviewer used for authorization and audit.
   */
  reviewer:
    | {
        id: PrincipalId;
        kind: 'principal';
        [k: string]: unknown;
      }
    | {
        id: AgentExecutionId;
        kind: 'agent_execution';
        [k: string]: unknown;
      }
    | {
        kind: 'runtime_policy';
        [k: string]: unknown;
      };
  reviewerAgentSpecId?: string | null;
  reviewerKind: TaskResultReviewerKind;
  reviewerThreadId?: string | null;
  reviewerTurnId?: string | null;
  reviewerUserId?: string | null;
  runId: string;
  supersedesReviewEventId?: string | null;
  taskId: string;
  taskRunTurnId: string;
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
  /**
   * Canonical target persisted by Gateway. Callers provide this only for
   * `ExactThread`; for semantic targets it is server-owned output.
   */
  threadId?: string | null;
  /**
   * Required for `Thread` delivery. Gateway resolves semantic targets to a
   * canonical `thread_id` before persisting the Task.
   */
  threadTarget?: TaskDeliveryThreadTarget | null;
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
  /**
   * Explicit, bounded cross-capsule delegations requested for this root
   * Agent execution. These are authorization inputs, never prompt content.
   */
  agent_delegation_routes?: AgentRootDelegationRequest[];
  /**
   * Typed identity/profile intent for a root Agent Turn. When omitted, the
   * protected Pioneer identity is selected, or the exact CLI identity named
   * by `execution_backend` is used.
   */
  agent_launch?: AgentLaunchSelection | null;
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
/**
 * Optional typed extension accepted by `turn/start` for automatic,
 * short-lived root-execution delegation. It is deliberately separate from
 * the prompt and has no participant/role/ACL fields.
 */
export interface AgentRootDelegationRequest {
  allowedActions: AgentRouteAction[];
  destinationAgentIdentityId?: AgentIdentityId | null;
  destinationProfileId?: AgentExecutionProfileId | null;
  destinationThreadId: string;
  disclosure: AgentRouteDisclosurePolicy;
  expiresAt: number;
  idempotencyKey: string;
  returnRouteId?: AgentDelegationRouteId | null;
}
export interface AgentRouteDisclosurePolicy {
  /**
   * Exact, already-authorized artifact handles. Raw files and paths are
   * never represented by this flag.
   */
  artifacts?: boolean;
  /**
   * Bounded conversation excerpts or summaries selected by server policy.
   */
  context?: boolean;
  /**
   * Result return is a separate disclosure class: allowing ordinary text
   * must never imply that a full Task result can cross a capsule boundary.
   */
  resultReturn?: 'none' | 'summary_only' | 'full_result';
  /**
   * Explicit text authored for the routed operation.
   */
  text?: boolean;
  /**
   * Explicit user-provided Task inputs. This is deliberately independent
   * from Agent-authored text and inherited conversation context.
   */
  userInput?: boolean;
}
export interface AgentLaunchSelection {
  agent: AgentIdentitySelection;
  execution: AgentExecutionSelection;
}
export interface AgentExecutionSelection {
  mcpServerIds?: string[];
  permissionProfile?: TurnPermissionProfileSelection | null;
  profile: AgentExecutionProfileSelection;
  reasoning?: TurnReasoningSelection | null;
  skillIds?: SkillId[];
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

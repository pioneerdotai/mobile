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
export type ProviderFailureClass =
  | 'network_transient'
  | 'rate_limit'
  | 'provider_5xx'
  | 'auth_expired'
  | 'auth_or_permission'
  | 'model_not_found'
  | 'prompt_too_long'
  | 'context_too_large'
  | 'max_output_tokens'
  | 'stream_stall'
  | 'stream_truncated'
  | 'empty_response'
  | 'provider_rejected'
  | 'unsupported_parameter'
  | 'unsupported_capability'
  | 'unsupported_image_input'
  | 'unsupported_tool_calling'
  | 'unsupported_streaming'
  | 'malformed_provider_request'
  | 'invalid_request'
  | 'permission_denied'
  | 'unknown';
/**
 * Allowlisted OpenRouter Chat Completions metadata.error_type values.
 * Diagnostic only: these values must not drive recovery policy.
 */
export type ProviderErrorReason =
  | 'context_length_exceeded'
  | 'max_tokens_exceeded'
  | 'token_limit_exceeded'
  | 'string_too_long'
  | 'authentication'
  | 'permission_denied'
  | 'payment_required'
  | 'rate_limit_exceeded'
  | 'provider_overloaded'
  | 'provider_unavailable'
  | 'invalid_request'
  | 'invalid_prompt'
  | 'not_found'
  | 'precondition_failed'
  | 'payload_too_large'
  | 'unprocessable'
  | 'content_policy_violation'
  | 'refusal'
  | 'invalid_image'
  | 'image_too_large'
  | 'image_too_small'
  | 'unsupported_image_format'
  | 'image_not_found'
  | 'image_download_failed'
  | 'server'
  | 'timeout'
  | 'unmapped';
export type ProviderRequestId = string;
export type ProviderFailureStage = 'connect' | 'first_chunk' | 'mid_stream' | 'finalize';
export type ProviderTransportKind = 'stream' | 'non_stream' | 'ws' | 'sse';
export type RecoveryStopReason =
  'attempts_exhausted' | 'wall_clock_exhausted' | 'no_progress' | 'policy_rejected' | 'terminal_failure';
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
/**
 * The value to set for a session configuration option.
 *
 * The `type` field acts as the discriminator in the serialized JSON form.
 * When no `type` is present, the value is treated as a [`SessionConfigValueId`]
 * via the [`ValueId`](Self::ValueId) fallback variant.
 *
 * The `type` discriminator describes the *shape* of the value, not the option
 * kind. For example every option kind that picks from a list of ids
 * (`select`, `radio`, …) would use [`ValueId`](Self::ValueId), while a
 * future freeform text option would get its own variant.
 */
export type SessionConfigOptionValue =
  | {
      type: 'boolean';
      /**
       * The boolean value.
       */
      value: boolean;
      [k: string]: unknown;
    }
  | {
      /**
       * The value ID.
       */
      value: string;
      [k: string]: unknown;
    };
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
export type CLIAgentRuntimeKind = ('codex' | 'claude') | 'acp';
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
  recoveryDiagnostic?: RecoveryDiagnostic | null;
  [k: string]: unknown;
}
export interface RecoveryDiagnostic {
  lastFailure?: RecoveryProviderFailure | null;
  stopReason?: RecoveryStopReason | null;
}
export interface RecoveryProviderFailure {
  class: ProviderFailureClass;
  errorReason?: ProviderErrorReason | null;
  httpStatus?: number | null;
  requestId?: ProviderRequestId | null;
  retryAfterMs?: number | null;
  stage: ProviderFailureStage;
  transport: ProviderTransportKind;
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
  /**
   * Exact normalized capabilities for a durable Task launch. Legacy launches
   * use skill_ids and mcp_server_ids when this field is empty.
   */
  selectedCapabilities?: TurnCapability[];
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
  acp_configuration?: AcpTurnConfiguration | null;
  effort?: string | null;
  personality?: string | null;
  sandbox?: unknown;
  steer_if_active?: boolean | null;
  summary?: string | null;
  [k: string]: unknown;
}
/**
 * Selection captured from a version-checked preparation, then frozen with the
 * existing launch/input. The actual admitted session revalidates descriptor
 * identity and every opaque value before dispatch. No elevated instructions.
 */
export interface AcpTurnConfiguration {
  additional_directories?: string[];
  configuration_replay?: AcpConfigurationChoice[];
  continuation_requested?: boolean;
  descriptor_fingerprint: string;
  expected: AcpConfigurationVersion;
  initial_descriptor_fingerprint?: string;
  mode?: string | null;
  session_id: string;
  values: {
    [k: string]: SessionConfigOptionValue;
  };
  [k: string]: unknown;
}
/**
 * An actually applied choice, in receive order. The descriptor identity is
 * checked before replay; opaque ids never determine dependency ordering.
 */
export interface AcpConfigurationChoice {
  config_id: string;
  descriptor_fingerprint: string;
  value: SessionConfigOptionValue;
  [k: string]: unknown;
}
export interface AcpConfigurationVersion {
  connection_id: string;
  revision: number;
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

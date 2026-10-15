/* eslint-disable */

export type AgentExecutionId = string;
export type AgentIdentityId = string;
export type AgentIdentitySourceKind = 'native_agent' | 'cli_runtime_instance' | 'ephemeral';
export type TaskErrorClass =
  'cancelled' | 'timeout' | 'provider' | 'tool' | 'validation' | 'dependency' | 'policy' | 'internal' | 'unknown';
export type PublicErrorCode =
  | 'invalid_input'
  | 'policy_denied'
  | 'not_found'
  | 'conflict'
  | 'resource_exhausted'
  | 'unavailable'
  | 'timeout'
  | 'internal';
export type PublicErrorStage =
  'discovery' | 'admission' | 'preparation' | 'execution' | 'persistence' | 'delivery' | 'observation';
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

export interface TaskInboxPublication {
  error?: string | null;
  items: TaskInboxItem[];
  loading: boolean;
  native_notifications: TaskNotificationEffect[];
  next_cursor?: string | null;
  opened?: TaskNotificationPublication | null;
  revision: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface TaskInboxItem {
  dismissing: boolean;
  notification: TaskUserNotification;
  revision: number;
  [k: string]: unknown;
}
/**
 * Durable exact-recipient Task notification returned by the user inbox.
 *
 * The websocket notification is only a live invalidation hint. This record is
 * the reconnect-safe source of truth and deliberately contains only the
 * collaborator-safe Task projection.
 */
export interface TaskUserNotification {
  acknowledgedAt?: number | null;
  author?: AgentPresentationSnapshot | null;
  createdAt: number;
  deliveryActionReceiptId?: string | null;
  deliveryId: string;
  error?: PublicTaskFailure | null;
  notificationId: string;
  result?: PublicTaskResult | null;
  runId: string;
  taskId: string;
  workspaceId: string;
  [k: string]: unknown;
}
export interface AgentPresentationSnapshot {
  agent_execution_id: AgentExecutionId;
  agent_identity_id: AgentIdentityId;
  avatar_revision?: string | null;
  display_name: string;
  identity_source_kind: AgentIdentitySourceKind;
  identity_source_revision: number;
  nickname: string;
  role_label?: string | null;
  [k: string]: unknown;
}
export interface PublicTaskFailure {
  class: TaskErrorClass;
  error: PublicError;
  recoveryDiagnostic?: RecoveryDiagnostic | null;
  [k: string]: unknown;
}
/**
 * Stable, bounded failure presentation shared by RPC, voice and task
 * execution surfaces. Raw source chains are never part of this type.
 */
export interface PublicError {
  code: PublicErrorCode;
  correlation_id: string;
  message: string;
  retry_after_ms?: number | null;
  retryable: boolean;
  stage: PublicErrorStage;
  version: number;
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
export interface PublicTaskResult {
  artifacts?: PublicTaskArtifact[];
  summary?: string | null;
  [k: string]: unknown;
}
export interface PublicTaskArtifact {
  artifactId?: string | null;
  mimeType?: string | null;
  versionId?: string | null;
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

/* eslint-disable */

export type TurnItem =
  | {
      attachments?: UserMessageAttachment[];
      id: string;
      text: string;
      type: 'userMessage';
      [k: string]: unknown;
    }
  | {
      id: string;
      markdown?: MarkdownDocument | null;
      markdownVersion?: number | null;
      phase?: AgentMessagePhase;
      text: string;
      type: 'agentMessage';
      [k: string]: unknown;
    }
  | {
      content?: string[];
      id: string;
      summary?: string[];
      type: 'reasoning';
      [k: string]: unknown;
    }
  | {
      code?: string | null;
      details?: unknown;
      id: string;
      level: SystemEventLevel;
      message: string;
      type: 'systemEvent';
      [k: string]: unknown;
    }
  | {
      agentRole?: string | null;
      childThreadId?: string | null;
      childTurnId?: string | null;
      createdAt: number;
      depth: number;
      errorPreview?: string | null;
      executorKind: TaskExecutorKind;
      id: string;
      maxDepth: number;
      nextFireAt?: number | null;
      parentTaskId?: string | null;
      progressPreview?: string | null;
      resultPreview?: string | null;
      rootTaskId?: string | null;
      runId?: string | null;
      status: TaskStatus;
      taskId: string;
      title: string;
      triggerKind: TaskTriggerKind;
      type: 'task';
      updatedAt: number;
      [k: string]: unknown;
    }
  | {
      arguments: unknown;
      command?: string[];
      cwd?: string | null;
      display: ToolDisplayPayload;
      id: string;
      observation?: ToolObservation | null;
      outcome?: ToolOutcome | null;
      outputPolicy: ToolOutputPolicySnapshot;
      recovery?: ToolRecoveryView | null;
      recoveryPolicy?: ToolRecoveryPolicySnapshot | null;
      status: ToolCallStatus;
      storage: ToolStoragePayload;
      success?: boolean | null;
      toolName: string;
      type: 'commandExecution';
      [k: string]: unknown;
    }
  | {
      arguments: unknown;
      changedFiles?: string[];
      display: ToolDisplayPayload;
      exitCode?: number | null;
      id: string;
      observation?: ToolObservation | null;
      outcome?: ToolOutcome | null;
      outputPolicy: ToolOutputPolicySnapshot;
      recovery?: ToolRecoveryView | null;
      recoveryPolicy?: ToolRecoveryPolicySnapshot | null;
      status: ToolCallStatus;
      stderr?: string | null;
      stdout?: string | null;
      storage: ToolStoragePayload;
      success?: boolean | null;
      toolName: string;
      type: 'fileChange';
      [k: string]: unknown;
    }
  | {
      arguments: unknown;
      display: ToolDisplayPayload;
      id: string;
      observation?: ToolObservation | null;
      outcome?: ToolOutcome | null;
      outputPolicy: ToolOutputPolicySnapshot;
      provider?: string | null;
      query?: string | null;
      recovery?: ToolRecoveryView | null;
      recoveryPolicy?: ToolRecoveryPolicySnapshot | null;
      resultCount?: number | null;
      results?: WebSearchResultItem[];
      status: ToolCallStatus;
      storage: ToolStoragePayload;
      success?: boolean | null;
      tookMs?: number | null;
      toolName: string;
      type: 'webSearch';
      [k: string]: unknown;
    }
  | {
      arguments: unknown;
      bytesReceived?: number | null;
      contentType?: string | null;
      display: ToolDisplayPayload;
      elapsedMs?: number | null;
      extractMode?: string | null;
      finalUrl?: string | null;
      id: string;
      links?: WebFetchLink[];
      observation?: ToolObservation | null;
      outcome?: ToolOutcome | null;
      outputPolicy: ToolOutputPolicySnapshot;
      recovery?: ToolRecoveryView | null;
      recoveryPolicy?: ToolRecoveryPolicySnapshot | null;
      resolvedMode?: string | null;
      status: ToolCallStatus;
      statusCode?: number | null;
      storage: ToolStoragePayload;
      success?: boolean | null;
      title?: string | null;
      toolName: string;
      truncated?: unknown;
      type: 'webFetch';
      url?: string | null;
      wordCount?: number | null;
      [k: string]: unknown;
    }
  | {
      arguments: unknown;
      bytesWritten?: number | null;
      contentType?: string | null;
      display: ToolDisplayPayload;
      elapsedMs?: number | null;
      finalUrl?: string | null;
      id: string;
      observation?: ToolObservation | null;
      outcome?: ToolOutcome | null;
      outputPolicy: ToolOutputPolicySnapshot;
      path?: string | null;
      recovery?: ToolRecoveryView | null;
      recoveryPolicy?: ToolRecoveryPolicySnapshot | null;
      sha256?: string | null;
      status: ToolCallStatus;
      statusCode?: number | null;
      storage: ToolStoragePayload;
      success?: boolean | null;
      toolName: string;
      truncated?: boolean | null;
      type: 'download';
      url?: string | null;
      [k: string]: unknown;
    }
  | {
      arguments: unknown;
      display: ToolDisplayPayload;
      id: string;
      observation?: ToolObservation | null;
      outcome?: ToolOutcome | null;
      outputPolicy: ToolOutputPolicySnapshot;
      recovery?: ToolRecoveryView | null;
      recoveryPolicy?: ToolRecoveryPolicySnapshot | null;
      status: ToolCallStatus;
      storage: ToolStoragePayload;
      success?: boolean | null;
      toolName: string;
      type: 'dynamicToolCall';
      [k: string]: unknown;
    };
export type UserMessageAttachment =
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
      artifact: ArtifactRef;
      type: 'artifact';
      [k: string]: unknown;
    }
  | {
      capability: TurnSkillCapabilitySummary;
      type: 'skill';
      [k: string]: unknown;
    }
  | {
      capability: TurnMcpServerCapabilitySummary;
      type: 'mcpServer';
      [k: string]: unknown;
    }
  | {
      capability: TurnMcpToolCapabilitySummary;
      type: 'mcpTool';
      [k: string]: unknown;
    };
export type ArtifactKind =
  | 'file'
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'pdf'
  | 'spreadsheet'
  | 'archive'
  | 'json'
  | 'generated_image'
  | 'screenshot'
  | 'workspace_file'
  | 'directory_manifest'
  | 'unknown';
export type ArtifactProjectionKind = 'plain_text' | 'thumbnail' | 'json_summary' | 'pdf_text';
export type ArtifactProjectionStatus = 'pending' | 'ready' | 'failed' | 'stale';
export type ArtifactStatus = 'ready' | 'pending' | 'quarantined' | 'deleted' | 'missing_external_source' | 'failed';
export type McpScopeKind = 'workspace' | 'user';
export type MarkdownBlock =
  | MarkdownInline
  | {
      content: MarkdownInline1;
      level: number;
      type: 'heading';
      [k: string]: unknown;
    }
  | MarkdownList
  | {
      blocks: MarkdownBlock[];
      type: 'quote';
      [k: string]: unknown;
    }
  | {
      language?: string | null;
      text: string;
      type: 'code';
      [k: string]: unknown;
    }
  | {
      type: 'rule';
      [k: string]: unknown;
    };
export type MarkdownMarkKind =
  | {
      type: 'bold';
      [k: string]: unknown;
    }
  | {
      type: 'italic';
      [k: string]: unknown;
    }
  | {
      type: 'strike';
      [k: string]: unknown;
    }
  | {
      type: 'code';
      [k: string]: unknown;
    }
  | {
      type: 'link';
      url: string;
      [k: string]: unknown;
    };
export type AgentMessagePhase = 'final_answer' | 'commentary';
export type SystemEventLevel = 'info' | 'warning' | 'error';
export type TaskExecutorKind = 'agent' | 'tool' | 'workflow' | 'webhook' | 'system';
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
export type TaskTriggerKind = 'immediate' | 'scheduled_at' | 'interval' | 'cron' | 'manual' | 'external' | 'dependency';
export type ToolDisplayPayload =
  | {
      aggregated_output?: string | null;
      duration_ms?: number | null;
      exit_code?: number | null;
      kind: 'shell';
      stderr?: string | null;
      stdout?: string | null;
      timed_out?: boolean | null;
      truncated: boolean;
      [k: string]: unknown;
    }
  | ToolOutputSummary
  | {
      kind: 'progress';
      metadata: {
        [k: string]: ToolMetadataValue;
      };
      stage: string;
      [k: string]: unknown;
    }
  | {
      kind: 'hidden';
      [k: string]: unknown;
    };
export type ToolMetadataValue =
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
      kind: 'number';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'string';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'array';
      values: ToolMetadataValue[];
      [k: string]: unknown;
    }
  | {
      fields: {
        [k: string]: ToolMetadataValue;
      };
      kind: 'object';
      [k: string]: unknown;
    }
  | {
      bytes: number;
      kind: 'redacted_raw';
      raw_kind: ToolMetadataRawKind;
      sha256: string;
      value_kind: string;
      [k: string]: unknown;
    };
export type ToolMetadataRawKind =
  | 'content'
  | 'body'
  | 'blob'
  | 'base64'
  | 'bytes'
  | 'data'
  | 'html'
  | 'image'
  | 'output'
  | 'screenshot'
  | 'stdout'
  | 'stderr'
  | 'text'
  | 'unknown';
export type ToolErrorClass =
  | 'invalid_arguments'
  | 'not_found'
  | 'tool_not_visible'
  | 'permission_denied'
  | 'command_not_found'
  | 'timeout'
  | 'cancelled'
  | 'execution_failed'
  | 'needs_narrowing'
  | 'internal'
  | 'output_truncated'
  | 'unknown';
export type ToolOutcomeStatus = 'ok' | 'recoverable_error' | 'fatal_error' | 'partial_success';
export type DeltaOutputPolicy =
  | {
      max_chunk_bytes: number;
      max_total_bytes: number;
      mode: 'persist_and_display';
      [k: string]: unknown;
    }
  | {
      mode: 'progress_only';
      [k: string]: unknown;
    }
  | {
      mode: 'disabled';
      [k: string]: unknown;
    };
export type LlmOutputPolicy =
  | {
      max_bytes: number;
      mode: 'full';
      [k: string]: unknown;
    }
  | {
      max_bytes: number;
      mode: 'structured';
      [k: string]: unknown;
    }
  | {
      mode: 'summary_only';
      [k: string]: unknown;
    };
export type LlmRetentionPolicy =
  | {
      max_bytes: number;
      mode: 'until_turn_terminal';
      [k: string]: unknown;
    }
  | {
      mode: 'do_not_retain';
      [k: string]: unknown;
    };
export type RecoveryOutputPolicy =
  | {
      diagnostic_excerpt: DiagnosticExcerptPolicy;
      include_error_class: boolean;
      include_exit_status: boolean;
      include_fingerprints: boolean;
      include_retry_hint: boolean;
      mode: 'evidence';
      [k: string]: unknown;
    }
  | {
      mode: 'metadata_only';
      [k: string]: unknown;
    }
  | {
      mode: 'none';
      [k: string]: unknown;
    };
export type DiagnosticExcerptPolicy =
  | {
      mode: 'disabled';
      [k: string]: unknown;
    }
  | {
      max_chars: number;
      mode: 'errors_only';
      [k: string]: unknown;
    }
  | {
      max_chars: number;
      mode: 'output';
      [k: string]: unknown;
    };
export type StorageOutputPolicy =
  | {
      max_bytes: number;
      mode: 'full';
      [k: string]: unknown;
    }
  | {
      max_chars: number;
      mode: 'summary';
      [k: string]: unknown;
    }
  | {
      mode: 'metadata_only';
      [k: string]: unknown;
    }
  | {
      mode: 'none';
      [k: string]: unknown;
    };
export type TimelineOutputPolicy =
  | {
      max_bytes: number;
      mode: 'full';
      [k: string]: unknown;
    }
  | {
      max_chars: number;
      mode: 'summary';
      [k: string]: unknown;
    }
  | {
      mode: 'metadata_only';
      [k: string]: unknown;
    }
  | {
      mode: 'hidden';
      [k: string]: unknown;
    };
export type ToolRecoveryIdempotencyMode = 'none' | 'safe' | 'requires_key' | 'session_bound';
export type RecoveryAction =
  | 'retry_attempt'
  | 'retry_with_backoff'
  | 'restart_turn'
  | 'replay_durable_event'
  | 'rehydrate_turn_state'
  | 'open_next_execution_window'
  | 'adapt_provider_request'
  | 'refresh_provider_auth'
  | 'compact_history'
  | 'disable_streaming'
  | 'disable_unsupported_capability'
  | 'repair_artifact_finalization'
  | 'requeue_task_dispatch'
  | 'block_resumable'
  | 'fallback'
  | 'mark_failed';
export type ToolRecoveryRetryClass = 'never' | 'transient' | 'arguments' | 'session' | 'network';
export type ToolCallStatus = 'in_progress' | 'completed' | 'failed';
export type ToolStoragePayload =
  | {
      aggregated_output?: string | null;
      duration_ms?: number | null;
      exit_code?: number | null;
      kind: 'shell';
      stderr?: string | null;
      stdout?: string | null;
      timed_out?: boolean | null;
      truncated: boolean;
      [k: string]: unknown;
    }
  | ToolOutputSummary1
  | {
      kind: 'metadata';
      metadata: {
        [k: string]: ToolMetadataValue;
      };
      [k: string]: unknown;
    }
  | {
      kind: 'none';
      [k: string]: unknown;
    };
export type TurnItemType =
  | 'user_message'
  | 'agent_message'
  | 'reasoning'
  | 'system_event'
  | 'task'
  | 'command_execution'
  | 'file_change'
  | 'web_search'
  | 'web_fetch'
  | 'download'
  | 'dynamic_tool_call';
export type TurnWorkItemStatus = 'running' | 'completed' | 'blocked' | 'failed' | 'cancelled';
export type TurnWorkPresentation = 'expanded_live' | 'collapsed_after_final' | 'expanded_terminal_no_final';
export type TurnWorkState =
  'starting' | 'running' | 'waiting_for_approval' | 'stalled' | 'completed' | 'blocked' | 'failed' | 'interrupted';

export interface TurnWorkPageResponse {
  items?: TurnWorkItem[];
  page: TimelinePageInfo;
  projectionVersion: number;
  threadId: string;
  turnId: string;
  work: TurnWorkBlock;
  workspaceId: string;
  [k: string]: unknown;
}
export interface TurnWorkItem {
  completedAtUnixMs?: number | null;
  item: TurnItem;
  itemId: string;
  itemType: TurnItemType;
  metadata?: unknown;
  orderKey: string;
  startedAtUnixMs?: number | null;
  status: TurnWorkItemStatus;
  turnId: string;
  workItemId: string;
  [k: string]: unknown;
}
export interface ArtifactRef {
  artifact_id: string;
  display_name: string;
  kind: ArtifactKind;
  mime_type?: string | null;
  preview?: ArtifactPreviewRef | null;
  sha256?: string | null;
  size_bytes?: number | null;
  status: ArtifactStatus;
  version_id?: string | null;
  [k: string]: unknown;
}
export interface ArtifactPreviewRef {
  artifact_id: string;
  blob_id?: string | null;
  mime_type?: string | null;
  projection_kind: ArtifactProjectionKind;
  sha256?: string | null;
  size_bytes?: number | null;
  status: ArtifactProjectionStatus;
  version_id: string;
  [k: string]: unknown;
}
export interface TurnSkillCapabilitySummary {
  id: string;
  label: string;
  slug: string;
  sourceKind: string;
  [k: string]: unknown;
}
export interface TurnMcpServerCapabilitySummary {
  id: string;
  label: string;
  name: string;
  scopeKind: McpScopeKind;
  [k: string]: unknown;
}
export interface TurnMcpToolCapabilitySummary {
  id: string;
  label: string;
  rawToolName: string;
  scopeKind: McpScopeKind;
  serverName: string;
  [k: string]: unknown;
}
export interface MarkdownDocument {
  blocks?: MarkdownBlock[];
  [k: string]: unknown;
}
export interface MarkdownInline {
  type: 'paragraph';
  [k: string]: unknown;
}
export interface MarkdownInline1 {
  marks?: MarkdownMark[];
  text: string;
  [k: string]: unknown;
}
export interface MarkdownMark {
  end: number;
  kind: MarkdownMarkKind;
  start: number;
  [k: string]: unknown;
}
export interface MarkdownList {
  type: 'list';
  [k: string]: unknown;
}
export interface ToolOutputSummary {
  kind: 'summary';
  [k: string]: unknown;
}
export interface ToolObservation {
  attemptId: number;
  eventSeq: number;
  monoNs: number;
  pipelineStage: string;
  toolCallId: string;
  traceId: string;
  tsUnixMs: number;
  turnId: string;
  [k: string]: unknown;
}
export interface ToolOutcome {
  errorClass?: ToolErrorClass | null;
  incomplete: boolean;
  incompleteReason?: string | null;
  retryHint?: string | null;
  shouldRetry: boolean;
  status: ToolOutcomeStatus;
  [k: string]: unknown;
}
export interface ToolOutputPolicySnapshot {
  deltas: DeltaOutputPolicy;
  llm: LlmOutputPolicy;
  llmRetention: LlmRetentionPolicy;
  recovery: RecoveryOutputPolicy;
  storage: StorageOutputPolicy;
  timeline: TimelineOutputPolicy;
  [k: string]: unknown;
}
export interface ToolRecoveryView {
  contentFingerprint?: string | null;
  continuation?: unknown;
  diagnosticExcerpt?: string | null;
  diagnosticSummary?: string | null;
  errorClass?: string | null;
  incompleteReason?: string | null;
  outputFingerprint?: string | null;
  retryHint?: string | null;
  wasTruncated: boolean;
  [k: string]: unknown;
}
export interface ToolRecoveryPolicySnapshot {
  baseBackoffSecs: number;
  canResume: boolean;
  idempotencyMode: ToolRecoveryIdempotencyMode;
  maxAttempts: number;
  maxWallClockSecs: number;
  noProgressLimit: number;
  resolvedAction: RecoveryAction;
  retryClass: ToolRecoveryRetryClass;
  [k: string]: unknown;
}
export interface ToolOutputSummary1 {
  kind: 'summary';
  [k: string]: unknown;
}
export interface WebSearchResultItem {
  publishedAt?: string | null;
  rank: number;
  snippet: string;
  source: string;
  title: string;
  url: string;
  [k: string]: unknown;
}
export interface WebFetchLink {
  text: string;
  url: string;
  [k: string]: unknown;
}
export interface TimelinePageInfo {
  afterCursor?: TimelineCursor | null;
  beforeCursor?: TimelineCursor | null;
  hasMoreAfter: boolean;
  hasMoreBefore: boolean;
  [k: string]: unknown;
}
export interface TimelineCursor {
  value: string;
  [k: string]: unknown;
}
export interface TurnWorkBlock {
  afterCursor?: TimelineCursor | null;
  beforeCursor?: TimelineCursor | null;
  completedAtUnixMs?: number | null;
  elapsedMs?: number | null;
  firstWorkItemId?: string | null;
  hasMoreAfter: boolean;
  hasMoreBefore: boolean;
  hiddenWorkCount: number;
  lastWorkItemId?: string | null;
  presentation: TurnWorkPresentation;
  startedAtUnixMs?: number | null;
  state: TurnWorkState;
  turnId: string;
  visibleWorkCount: number;
  workCount: number;
  [k: string]: unknown;
}

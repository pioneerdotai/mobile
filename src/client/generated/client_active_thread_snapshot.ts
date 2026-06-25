/* eslint-disable */

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
export type TimelineEntryStatus = 'Running' | 'Completed' | 'Blocked' | 'Failed' | 'Cancelled';
export type TimelineOriginKind = 'parent_turn' | 'task_event' | 'child_turn';
export type TimelineLane = 'parent' | 'task' | 'child_agent' | 'child_tool' | 'child_reasoning' | 'child_result';
export type TurnPhase = 'Starting' | 'Running' | 'Completing' | 'Completed' | 'Blocked' | 'Failed' | 'Cancelled';
export type TimelineRowKind =
  | {
      Item: {
        timeline_index: number;
        [k: string]: unknown;
      };
    }
  | {
      TurnWorkToggle: TurnWorkGroupRow;
    }
  | {
      CoalescedTools: TimelineCoalescedToolsRow;
    }
  | {
      RunningTurn: RunningTurnDisplay;
    };
export type TimelineCoalescedToolsKind = 'CompletedTaskTools' | 'RepeatedTaskWait';
export type ThreadMode = 'Chat' | 'Agent';
export type ThreadStatus = 'Active' | 'Idle' | 'Closed';
export type PromptManifestDiagnosticCode =
  | 'missing_file'
  | 'file_read_error'
  | 'file_truncated'
  | 'total_budget_truncated'
  | 'file_filtered_by_profile'
  | 'dynamic_section_truncated'
  | 'dynamic_section_omitted'
  | 'hook_diagnostic'
  | 'hook_best_effort_failed'
  | 'capability_rejected';
export type PromptManifestHookPhase =
  | 'turn_pre_prompt_context'
  | 'turn_post_preflight_prompt_context'
  | 'turn_pre_prompt_compile'
  | 'runtime_turn_pre_context';
export type PromptManifestHookContributionKind =
  | 'prompt_context'
  | 'thread_context'
  | 'prompt_section'
  | 'prompt_manifest_diagnostic'
  | 'runtime_failure';
export type PromptManifestHookTruncation = 'none' | 'hook' | 'prompt' | 'hook_and_prompt' | 'unknown';
export type PromptManifestProfile = 'assistant_full' | 'assistant_minimal' | 'assistant_none' | 'cli_runtime';
export type TurnStatus = 'InProgress' | 'Completed' | 'Failed' | 'Interrupted' | 'Blocked';

export interface ClientActiveThreadSnapshot {
  history_loaded: boolean;
  history_loading: boolean;
  projection: ConversationViewState;
  rows: TimelineRow[];
  thread?: Thread | null;
  thread_id?: string | null;
  workspace_id?: string | null;
  [k: string]: unknown;
}
export interface ConversationViewState {
  composer_locked: boolean;
  in_flight_turn_id?: string | null;
  items: ItemView[];
  last_error?: string | null;
  pending_request_id?: string | null;
  phase_label: string;
  revision: number;
  timeline: TimelineEntry[];
  turns: TurnView[];
  [k: string]: unknown;
}
export interface ItemView {
  completed_at_unix_ms?: number | null;
  final_markdown?: MarkdownDocument | null;
  final_text?: string | null;
  id: string;
  item: TurnItem;
  item_type: string;
  opaque_meta?: unknown;
  partial_markdown?: MarkdownDocument | null;
  partial_text: string;
  started_at_unix_ms?: number | null;
  status: TimelineEntryStatus;
  timeline_origin?: TimelineOrigin | null;
  turn_id: string;
  updated_at_unix_ms?: number | null;
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
export interface TimelineOrigin {
  childThreadId?: string | null;
  childTurnId?: string | null;
  kind: TimelineOriginKind;
  lane: TimelineLane;
  occurredAt: number;
  originEventId?: string | null;
  originSequence: number;
  originTurnItemId?: string | null;
  runId?: string | null;
  taskId?: string | null;
  [k: string]: unknown;
}
export interface TimelineEntry {
  id: string;
  item_id: string;
  item_index: number;
  turn_id: string;
  [k: string]: unknown;
}
export interface TurnView {
  completed_at_unix_ms?: number | null;
  error?: string | null;
  id: string;
  phase: TurnPhase;
  resume?: TurnBlockedResumeMetadata | null;
  started_at_unix_ms?: number | null;
  [k: string]: unknown;
}
export interface TurnBlockedResumeMetadata {
  blocked_recovery_job_id?: string | null;
  can_resume_same_turn: boolean;
  human_message: string;
  latest_checkpoint_id?: string | null;
  reason_class: string;
  resume_command: string;
  resume_requirements: string[];
  [k: string]: unknown;
}
export interface TimelineRow {
  key: string;
  kind: TimelineRowKind;
  [k: string]: unknown;
}
export interface TurnWorkGroupRow {
  anchor_entry_id: string;
  elapsed_ms?: number | null;
  is_open: boolean;
  toggle_key: string;
  [k: string]: unknown;
}
export interface TimelineCoalescedToolsRow {
  count: number;
  is_open: boolean;
  kind: TimelineCoalescedToolsKind;
  toggle_key: string;
  [k: string]: unknown;
}
export interface RunningTurnDisplay {
  started_at_unix_ms?: number | null;
  turn_id: string;
  [k: string]: unknown;
}
export interface Thread {
  agent_nickname?: string | null;
  agent_role?: string | null;
  created_at: number;
  id: string;
  mode: ThreadMode;
  model: string;
  model_provider: string;
  name?: string | null;
  origin_kind?: 'user' | 'task_run' | 'system';
  preview: string;
  reasoning_effort?: string | null;
  sidebar_visibility?: 'visible' | 'hidden';
  status: ThreadStatus;
  turns: Turn[];
  updated_at: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface Turn {
  error?: string | null;
  id: string;
  origin?: 'user' | 'scheduled_task' | 'detached_task' | 'attached_task';
  prompt_manifest?: PromptManifest | null;
  status: TurnStatus;
  turn_kind?: 'conversation' | 'task_run';
  [k: string]: unknown;
}
export interface PromptManifest {
  compiler_version: string;
  diagnostics?: PromptManifestDiagnostic[];
  fingerprint_dynamic: string;
  fingerprint_full: string;
  fingerprint_stable: string;
  hook_sources?: PromptManifestHookSourceEntry[];
  profile: PromptManifestProfile;
  section_ids?: string[];
  [k: string]: unknown;
}
export interface PromptManifestDiagnostic {
  code: PromptManifestDiagnosticCode;
  file?: string | null;
  hook_source?: PromptManifestHookSource | null;
  message: string;
  section_id?: string | null;
  [k: string]: unknown;
}
export interface PromptManifestHookSource {
  contribution_hash?: string | null;
  contribution_id?: string | null;
  hook_id: string;
  phase: PromptManifestHookPhase;
  subscription_id: string;
  [k: string]: unknown;
}
export interface PromptManifestHookSourceEntry {
  contribution_kind: PromptManifestHookContributionKind;
  priority?: number | null;
  section_id?: string | null;
  source: PromptManifestHookSource;
  source_count?: number | null;
  truncation: PromptManifestHookTruncation;
  [k: string]: unknown;
}

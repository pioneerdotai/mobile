/* eslint-disable */

export type ClientScope =
  | {
      kind: 'session';
      [k: string]: unknown;
    }
  | {
      kind: 'navigation';
      [k: string]: unknown;
    }
  | {
      kind: 'sidebar_summary';
      thread_id: string;
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'workspace_tree';
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'task_inbox';
      workspace_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'task';
      task_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'thread';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'timeline';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'composer';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'pending_request';
      thread_id?: string | null;
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'artifact';
      thread_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'avatar';
      principal_id: string;
      [k: string]: unknown;
    }
  | {
      kind: 'provider';
      [k: string]: unknown;
    }
  | {
      kind: 'administration';
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'mcp';
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'skills';
      workspace_id?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'settings';
      [k: string]: unknown;
    }
  | {
      kind: 'onboarding_invitation';
      [k: string]: unknown;
    }
  | {
      kind: 'agents_document';
      workspace_id: string;
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
export type TimelineAttachmentKind = 'artifact' | 'file' | 'image' | 'audio' | 'video' | 'skill' | 'mcp';
export type TimelineCapabilityKind = 'Skill' | 'McpServer' | 'McpTool' | 'Unknown';
export type TimelineFinalStatusKind = 'Cancelled' | 'Blocked' | 'Failed' | 'Running' | 'Completed';
export type TimelineItemKind =
  | 'UserMessage'
  | 'AgentMessage'
  | 'Reasoning'
  | 'SystemEvent'
  | 'Task'
  | 'CommandExecution'
  | 'FileChange'
  | 'WebSearch'
  | 'WebFetch'
  | 'Download'
  | 'DynamicToolCall'
  | 'Unknown';
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
      attachment?: 'attached' | 'detached';
      childThreadId?: string | null;
      childTurnId?: string | null;
      createdAt: number;
      createdByTurnId?: string | null;
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
      startedAt?: number | null;
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
      /**
       * Operational supervision semantics declared by the tool contract.
       * This is independent from the presentation-level item type.
       */
      executionClass?: ('standard' | 'context_compaction') | 'durable_wait';
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
      capability: TurnSkillPackCapabilitySummary;
      type: 'skillPack';
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
export type SkillPackId = string;
export type SkillId = string;
export type McpScopeKind = 'workspace' | 'user';
export type AgentMessagePhase = 'final_answer' | 'commentary';
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
export type AgentRouteAction =
  'send_message' | 'start_agent' | 'create_task' | 'schedule_task' | 'review_task_result' | 'deliver_result';
export type CrossThreadSourceVisibility = 'accessible' | 'inaccessible';
export type TimelineEntryStatus = 'Running' | 'Completed' | 'Blocked' | 'Failed' | 'Cancelled';
export type TimelineOriginKind = 'parent_turn' | 'task_event' | 'child_turn';
export type TimelineLane = 'parent' | 'task' | 'child_agent' | 'child_tool' | 'child_reasoning' | 'child_result';
export type SemanticTimelineRowId =
  | {
      TopLevelBlock: {
        block_id: string;
        [k: string]: unknown;
      };
    }
  | {
      TurnWorkItem: {
        turn_id: string;
        work_item_id: string;
        [k: string]: unknown;
      };
    };
export type TimelineRenderRow =
  | {
      Timeline: TimelineRow;
    }
  | {
      PendingRequest: TimelinePendingRequestRow;
    };
export type PersistedActorRef =
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
      kind: 'system';
      [k: string]: unknown;
    };
export type PrincipalId = string;
export type AgentExecutionId = string;
export type AgentIdentityId = string;
export type AgentIdentitySourceKind = 'native_agent' | 'cli_runtime_instance' | 'ephemeral';
export type TimelineRowKind =
  | {
      Item: {
        timeline_index: number;
        [k: string]: unknown;
      };
    }
  | {
      UserMessage: {
        presentation: UserMessagePresentation;
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
export type ThreadMode = ('Message' | 'Agent') | 'Chat';
export type TimelineReplyState = 'available' | 'deleted' | 'unavailable';
export type TurnWorkState =
  'starting' | 'running' | 'waiting_for_approval' | 'stalled' | 'completed' | 'blocked' | 'failed' | 'interrupted';
export type TimelineCoalescedToolsKind = 'CompletedTaskTools' | 'RepeatedTaskWait';
export type AgentWorkNodeState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'blocked';
export type PermissionBehavior = 'allow' | 'ask' | 'deny';
export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';
export type TurnPermissionProfileSource =
  'composer' | 'defaulted' | 'inherited_from_parent_turn' | 'task_permission_cap' | 'system';
export type TurnSecurityCapabilityKind = 'filesystem' | 'network' | 'process' | 'approval' | 'sandbox_backend';
export type ClientSecurityEnforcementStatus = 'active' | 'degraded' | 'unavailable';
export type TurnSecurityExecutionBackendKind = 'native' | 'codex_cli' | 'claude_cli';
export type ClientSecurityFilesystemAccess = 'unrestricted' | 'read_only' | 'workspace_write';
export type TurnNetworkMode = 'disabled' | 'restricted' | 'enabled';
export type SandboxBackendKind = 'nono' | 'windows_restricted_token' | 'provider_native';
export type TurnSandboxMode = 'unrestricted' | 'read_only' | 'workspace_write';
export type PendingRequestKind =
  'command_approval' | 'file_change_approval' | 'permission_approval' | 'user_input' | 'other';
export type PendingRequestOrigin =
  | {
      origin: 'cli_runtime';
      runtime_id: string;
      [k: string]: unknown;
    }
  | {
      origin: 'native_permission_gate';
      [k: string]: unknown;
    };
export type PendingRequestPayload =
  | {
      request: CLIRuntimePendingRequest;
      source: 'cli_runtime';
      [k: string]: unknown;
    }
  | {
      request: TurnPermissionApprovalRequest;
      source: 'native_permission_gate';
      [k: string]: unknown;
    }
  | {
      payload?: unknown;
      source: 'other';
      [k: string]: unknown;
    };
export type CLIRuntimeRequestKind =
  'command_approval' | 'file_change_approval' | 'permission_approval' | 'user_input' | 'other';
export type TurnPermissionActionKind =
  | 'file_read'
  | 'file_write'
  | 'shell_command'
  | 'network'
  | 'mcp_read'
  | 'mcp_write_or_unknown'
  | 'dynamic_skill_tool'
  | 'computer_use'
  | 'task_subagent'
  | 'memory_write'
  | 'agent_action'
  | 'internal'
  | 'unknown';
export type TurnPermissionDecisionReason =
  | 'full_access'
  | 'policy_allows_action'
  | 'policy_requires_approval'
  | 'policy_denies_action'
  | 'cached_approval'
  | 'user_approved'
  | 'user_denied'
  | 'cancelled'
  | 'expired'
  | 'unknown_action_default'
  | 'sandbox_denied';
export type ClientPlannedEffect = ClientEffect | GatewaySessionStorageEffect;
export type ClientEffect =
  | (
      | 'RefreshWorkspaceList'
      | 'RefreshGatewaySettings'
      | 'RefreshProviderLists'
      | 'QueueSkillsRefresh'
      | 'EnqueueInFlightTurnsForResume'
    )
  | {
      UnsubscribeThreads: {
        thread_ids: string[];
        [k: string]: unknown;
      };
    };
export type GatewaySessionStorageEffect =
  | {
      ReadGatewaySession: {
        endpoint: GatewayEndpoint;
        [k: string]: unknown;
      };
    }
  | {
      PersistGatewaySession: {
        endpoint: GatewayEndpoint;
        envelope: GatewaySessionEnvelope;
        [k: string]: unknown;
      };
    };
export type GatewayEndpointKind = 'local' | 'remote';
export type GatewayId = string;
export type DeviceId = string;
export type AuthSessionId = string;
export type TokenFamilyId = string;

export interface ClientProcessChangeBatchDto {
  changes: ClientProcessChangeSetDto[];
  closed: boolean;
  effects: ClientEffectPlan[];
  resnapshot: boolean;
  schema_version: number;
  sequence: number;
  [k: string]: unknown;
}
export interface ClientProcessChangeSetDto {
  predecessor?: number | null;
  sequence: number;
  snapshots: ClientScopedSnapshotDto[];
  timeline_changes?: TimelineChangeSet[];
  [k: string]: unknown;
}
export interface ClientScopedSnapshotDto {
  payload: unknown;
  revisions: ClientRevisions;
  schema_version: number;
  scope: ClientScope;
  sequence: number;
  [k: string]: unknown;
}
export interface ClientRevisions {
  content: number;
  domain: number;
  presentation: number;
  scoped: number;
  [k: string]: unknown;
}
/**
 * Apply removals first, then replacements/insertions, then the complete new order.
 * Replacements keep their identity. An absent order means membership/order is unchanged.
 */
export interface TimelineChangeSet {
  from_revision: number;
  generation: number;
  inserted: TimelineRowSnapshot[];
  order?: string[] | null;
  removed: string[];
  replaced: TimelineRowSnapshot[];
  thread_id: string;
  to_revision: number;
  [k: string]: unknown;
}
/**
 * A self-contained row. Positional indexes in the value are local to this row.
 */
export interface TimelineRowSnapshot {
  anchor_item_id?: string | null;
  content?: TimelineItemPresentation | null;
  content_revision: number;
  id: string;
  item?: ItemView | null;
  metadata_revision: number;
  revision: number;
  semantic_id?: SemanticTimelineRowId | null;
  turn_id?: string | null;
  value: TimelineRenderRow;
  [k: string]: unknown;
}
export interface TimelineItemPresentation {
  attachments: TimelineAttachment[];
  capability_rejections: TimelineCapabilityRejection[];
  collapsed: boolean;
  command?: TimelineCommandContent | null;
  edited_timestamp?: number | null;
  file_output?: TimelineTextPreview | null;
  final_status?: TimelineFinalStatus | null;
  kind: TimelineItemKind;
  markdown?: MarkdownDocument | null;
  streaming: boolean;
  system_label?: SystemEventLabel | null;
  task_timeline: boolean;
  text: string;
  timestamp?: number | null;
  tool?: TimelineToolContent | null;
  [k: string]: unknown;
}
export interface TimelineAttachment {
  artifact?: ArtifactRef | null;
  id: string;
  kind: TimelineAttachmentKind;
  parent_title?: string | null;
  title: string;
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
export interface TimelineCapabilityRejection {
  id?: string | null;
  kind: TimelineCapabilityKind;
  label?: string | null;
  message: string;
  name?: string | null;
  [k: string]: unknown;
}
export interface TimelineCommandContent {
  command: string;
  duration_ms?: number | null;
  exit_code?: number | null;
  output: TimelineTextPreview;
  terminal_output: TimelineTextPreview;
  timed_out?: boolean | null;
  truncated?: boolean | null;
  [k: string]: unknown;
}
export interface TimelineTextPreview {
  text: string;
  truncated: boolean;
  [k: string]: unknown;
}
export interface TimelineFinalStatus {
  kind: TimelineFinalStatusKind;
  successful: boolean;
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
export interface TimelineToolContent {
  arguments_text?: TimelineTextPreview | null;
  bytes?: number | null;
  detail: string;
  host?: string | null;
  mcp?: McpTimelineMetadata | null;
  result_count?: number | null;
  result_text?: TimelineTextPreview | null;
  task_review?: TaskWaitReviewDisplay | null;
  url?: string | null;
  [k: string]: unknown;
}
export interface McpTimelineMetadata {
  catalog_version?: string | null;
  duration_ms?: number | null;
  raw_tool_name: string;
  result_truncated?: boolean | null;
  runtime_state?: string | null;
  server_id?: string | null;
  server_name: string;
  snapshot_version?: number | null;
  [k: string]: unknown;
}
export interface TaskWaitReviewDisplay {
  items: TaskWaitReviewDisplayItem[];
  mode?: string | null;
  review_required_count: number;
  [k: string]: unknown;
}
export interface TaskWaitReviewDisplayItem {
  allowed_actions: string[];
  candidate_id: string;
  candidate_status?: string | null;
  diagnostics: string[];
  extraction_error_preview?: string | null;
  max_revision_rounds?: number | null;
  owner_principal_id?: string | null;
  permission_mode?: string | null;
  permission_source?: string | null;
  remaining_revision_rounds?: number | null;
  result_preview?: string | null;
  review_mode?: string | null;
  revision_blocked_reason?: string | null;
  round?: number | null;
  run_id?: string | null;
  status?: string | null;
  summary?: string | null;
  task_id: string;
  title?: string | null;
  user_approval_required: boolean;
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
  route?: SafeRouteProvenance | null;
  started_at_unix_ms?: number | null;
  status: TimelineEntryStatus;
  timeline_origin?: TimelineOrigin | null;
  turn_id: string;
  updated_at_unix_ms?: number | null;
  [k: string]: unknown;
}
export interface TurnSkillCapabilitySummary {
  label: string;
  owner?: string | null;
  pack?: TurnSkillPackPresentationSummary | null;
  skillId: SkillId;
  slug: string;
  sourceKind: string;
  [k: string]: unknown;
}
export interface TurnSkillPackPresentationSummary {
  label: string;
  packId: SkillPackId;
  [k: string]: unknown;
}
export interface TurnSkillPackCapabilitySummary {
  label: string;
  packId: SkillPackId;
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
export interface SafeRouteProvenance {
  action: AgentRouteAction;
  disclosure: AgentRouteDisclosurePolicy;
  /**
   * Present only when the viewer has source read authority.  Source title,
   * participants, prompts, and raw identifiers are never sent otherwise.
   */
  sourceThreadLabel?: string | null;
  visibility: CrossThreadSourceVisibility;
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
export interface TimelineRow {
  author?: TurnAuthorSnapshot | null;
  key: string;
  kind: TimelineRowKind;
  [k: string]: unknown;
}
export interface TurnAuthorSnapshot {
  actor: PersistedActorRef;
  /**
   * Full immutable identity presentation for an agent-authored Turn.  This
   * is carried with the Turn instead of being reconstructed from mutable
   * identity/runtime state. Non-agent actors leave it absent.
   */
  agent?: AgentPresentationSnapshot | null;
  avatar_revision?: string | null;
  display_name: string;
  nickname: string;
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
/**
 * Authoritative collaboration metadata attached to a rendered user-message
 * row. It mirrors disclosed server fields; shells must not reconstruct it by
 * parsing text or by joining a mutable member directory.
 */
export interface UserMessagePresentation {
  attachments?: UserMessageAttachment[];
  author?: TurnAuthorSnapshot | null;
  block_id: string;
  deleted: boolean;
  edited: boolean;
  item_id: string;
  mentions?: TurnMention[];
  mode: ThreadMode;
  reply?: TimelineReplySummary | null;
  reply_state?: TimelineReplyState | null;
  revision: number;
  route?: SafeRouteProvenance | null;
  thread_id: string;
  turn_id: string;
  workspace_id: string;
}
export interface TurnMention {
  nickname: string;
  principal_id: PrincipalId;
  [k: string]: unknown;
}
export interface TimelineReplySummary {
  author?: TurnAuthorSnapshot | null;
  deleted?: boolean;
  text?: string | null;
  turnId: string;
  [k: string]: unknown;
}
export interface TurnWorkGroupRow {
  anchor_entry_id: string;
  elapsed_ms?: number | null;
  is_open: boolean;
  /**
   * Server-owned lifecycle state; clients must not infer it from row order.
   */
  state?: TurnWorkState | null;
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
  agent_work_graph?: AgentWorkGraphProjection | null;
  message?: string | null;
  permission_profile?: TurnPermissionProfileSnapshot | null;
  route?: SafeRouteProvenance | null;
  security_summary?: ClientTurnSecuritySummary | null;
  started_at_unix_ms?: number | null;
  state?: TurnWorkState | null;
  turn_id: string;
  [k: string]: unknown;
}
export interface AgentWorkGraphProjection {
  /**
   * Stable, bounded nodes in the exact root graph. No prompt, provider,
   * model, thread title, runtime path, or other private payload is exposed.
   */
  nodes: AgentWorkNodeProjection[];
  queuedCount: number;
  rootExecutionId: AgentExecutionId;
  runningCount: number;
  /**
   * True while one or more authorized nodes are durably queued for
   * server-owned capacity. This is resource state, not an authorization
   * failure and never implies that the whole graph is blocked.
   */
  saturated: boolean;
  terminalCount: number;
  /**
   * Monotonic persisted resource-state timestamp used only to reject stale
   * graph projections racing with live queue/promotion/finalization events.
   */
  updatedAtUnixMicros: number;
}
export interface AgentWorkNodeProjection {
  executionId: AgentExecutionId;
  progressLabel?: string | null;
  progressRevision: number;
  state: AgentWorkNodeState;
}
export interface TurnPermissionProfileSnapshot {
  effective_policy: ToolPermissionPolicySnapshot;
  mode: TurnPermissionMode;
  source: TurnPermissionProfileSource;
  [k: string]: unknown;
}
export interface ToolPermissionPolicySnapshot {
  agent_action: PermissionBehavior;
  allowed_paths?: string[];
  /**
   * See `allowed_tools_restricted`.  A restricted empty path set is a
   * durable deny-all result, while an unrestricted empty set is the legacy
   * wildcard.
   */
  allowed_paths_restricted?: boolean;
  allowed_tools?: string[];
  /**
   * `allowed_tools = []` historically means "no allow-list".  This bit
   * preserves the distinct result of intersecting two disjoint allow-lists:
   * a restricted empty set must deny every tool rather than reopen all of
   * them.
   */
  allowed_tools_restricted?: boolean;
  computer_use: PermissionBehavior;
  default_behavior: PermissionBehavior;
  denied_tools?: string[];
  dynamic_skill_tool: PermissionBehavior;
  file_read: PermissionBehavior;
  file_write: PermissionBehavior;
  mcp_read: PermissionBehavior;
  mcp_write_or_unknown: PermissionBehavior;
  memory_write: PermissionBehavior;
  network: PermissionBehavior;
  shell_command: PermissionBehavior;
  task_subagent: PermissionBehavior;
  [k: string]: unknown;
}
export interface ClientTurnSecuritySummary {
  diagnostics?: ClientSecurityDiagnostic[];
  enforcement: ClientSecurityEnforcementStatus;
  execution_backend: TurnSecurityExecutionBackendKind;
  filesystem_access: ClientSecurityFilesystemAccess;
  network_mode: TurnNetworkMode;
  permission_mode: TurnPermissionMode;
  sandbox_backend?: SandboxBackendKind | null;
  sandbox_mode: TurnSandboxMode;
  [k: string]: unknown;
}
export interface ClientSecurityDiagnostic {
  capability: TurnSecurityCapabilityKind;
  message: string;
  status: ClientSecurityEnforcementStatus;
  [k: string]: unknown;
}
export interface TimelinePendingRequestRow {
  author?: TurnAuthorSnapshot | null;
  key: string;
  request: PendingRequest;
  [k: string]: unknown;
}
export interface PendingRequest {
  item_id?: string | null;
  kind: PendingRequestKind;
  message?: string | null;
  native_request_id?: string | null;
  origin: PendingRequestOrigin;
  payload: PendingRequestPayload;
  request_id: string;
  thread_id?: string | null;
  title?: string | null;
  turn_id?: string | null;
  visible_thread_ids?: string[];
  workspace_id: string;
  [k: string]: unknown;
}
export interface CLIRuntimePendingRequest {
  kind: CLIRuntimeRequestKind;
  message?: string | null;
  native_request_id?: string | null;
  payload?: unknown;
  title?: string | null;
  [k: string]: unknown;
}
export interface TurnPermissionApprovalRequest {
  action: TurnPermissionActionKind;
  details?: TurnPermissionApprovalRequestDetail[];
  reason: TurnPermissionDecisionReason;
  request_id: string;
  scope_hash: string;
  summary?: string | null;
  thread_id: string;
  tool_name: string;
  turn_id: string;
  visible_thread_ids?: string[];
  workspace_id: string;
  [k: string]: unknown;
}
export interface TurnPermissionApprovalRequestDetail {
  label: string;
  monospace?: boolean;
  value: string;
  [k: string]: unknown;
}
export interface ClientEffectPlan {
  effect: ClientPlannedEffect;
  generation: number;
  operation_id: string;
  [k: string]: unknown;
}
export interface GatewayEndpoint {
  gateway_base_url: string;
  id: string;
  kind: GatewayEndpointKind;
  name: string;
  server_gateway_id?: GatewayId | null;
  service_name?: string | null;
  session_ref?: string | null;
  workspace_id?: string | null;
}
export interface GatewaySessionEnvelope {
  device_id: DeviceId;
  gateway_id: GatewayId;
  installation_id: string;
  pending_refresh_request_id?: string | null;
  principal_id: PrincipalId;
  refresh_expires_at_unix: number;
  refresh_generation: number;
  refresh_token: string;
  schema_version: number;
  session_id: AuthSessionId;
  token_family_id: TokenFamilyId;
}

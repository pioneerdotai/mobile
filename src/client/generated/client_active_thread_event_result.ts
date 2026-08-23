/* eslint-disable */

/**
 * Payload-safe reason for invalidating client authorization-derived state.
 *
 * This vocabulary deliberately contains no protected resource metadata or
 * policy-engine details.
 */
export type AccessChangeKind =
  | 'workspace_membership'
  | 'thread_created'
  | 'thread_visibility'
  | 'thread_participant_added'
  | 'thread_participant_removed';
export type AdministrationRefetch =
  | {
      kind: 'invitation_list';
      [k: string]: unknown;
    }
  | {
      kind: 'member_directory';
      [k: string]: unknown;
    }
  | {
      kind: 'workspace_members';
      workspace_id: WorkspaceId;
      [k: string]: unknown;
    };
export type WorkspaceId = string;
export type TimelineBlockKind =
  | {
      attachments?: UserMessageAttachment[];
      author?: TurnAuthorSnapshot | null;
      deleted?: boolean;
      edited?: boolean;
      inputs?: UserInput[];
      itemId?: string | null;
      kind: 'user_message';
      mentions?: TurnMention[];
      mode?: ('Message' | 'Agent') | 'Chat';
      reply?: TimelineReplySummary | null;
      revision?: number;
      route?: SafeRouteProvenance | null;
      text?: string;
      [k: string]: unknown;
    }
  | {
      kind: 'turn_work';
      work: TurnWorkBlock;
      [k: string]: unknown;
    }
  | {
      author?: TurnAuthorSnapshot | null;
      kind: 'detached_task_run';
      task: TaskTurnItem;
      [k: string]: unknown;
    }
  | {
      author?: TurnAuthorSnapshot | null;
      itemId: string;
      kind: 'assistant_message';
      markdown?: MarkdownDocument | null;
      route?: SafeRouteProvenance | null;
      status?: 'running' | 'completed' | 'blocked' | 'failed' | 'cancelled';
      text: string;
      [k: string]: unknown;
    }
  | {
      /**
       * Exact responding execution whose work this lifecycle row describes.
       */
      author?: TurnAuthorSnapshot | null;
      kind: 'turn_state';
      message?: string | null;
      route?: SafeRouteProvenance | null;
      state: TurnWorkState;
      [k: string]: unknown;
    }
  | {
      author?: TurnAuthorSnapshot | null;
      itemId?: string | null;
      kind: 'pending_request';
      request: CLIRuntimePendingRequest;
      requestId: string;
      runtimeId: string;
      status: CLIRuntimePendingRequestStatus;
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
export type SkillPackId = string;
export type SkillId = string;
export type McpScopeKind = 'workspace' | 'user';
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
export type AgentRouteAction =
  'send_message' | 'start_agent' | 'create_task' | 'schedule_task' | 'review_task_result' | 'deliver_result';
export type CrossThreadSourceVisibility = 'accessible' | 'inaccessible';
export type AgentWorkNodeState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'blocked';
export type TurnWorkPresentation = 'expanded_live' | 'collapsed_after_final' | 'expanded_terminal_no_final';
export type TurnWorkState =
  'starting' | 'running' | 'waiting_for_approval' | 'stalled' | 'completed' | 'blocked' | 'failed' | 'interrupted';
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
export type CLIRuntimeRequestKind = 'command_approval' | 'file_change_approval' | 'user_input' | 'other';
export type CLIRuntimePendingRequestStatus =
  | 'pending'
  | 'response_accepted'
  | 'delivering'
  | 'delivery_failed'
  | 'answered'
  | 'resolved'
  | 'cancelled'
  | 'expired';
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
export type AgentMessagePhase = 'final_answer' | 'commentary';
export type SystemEventLevel = 'info' | 'warning' | 'error';
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
export type TurnSecurityCapabilityKind = 'filesystem' | 'network' | 'process' | 'approval' | 'sandbox_backend';
export type ClientSecurityEnforcementStatus = 'active' | 'degraded' | 'unavailable';
export type TurnSecurityExecutionBackendKind = 'native' | 'codex_cli' | 'claude_cli';
export type ClientSecurityFilesystemAccess = 'unrestricted' | 'read_only' | 'workspace_write';
export type TurnNetworkMode = 'disabled' | 'restricted' | 'enabled';
export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';
export type SandboxBackendKind = 'nono' | 'windows_restricted_token' | 'provider_native';
export type TurnSandboxMode = 'unrestricted' | 'read_only' | 'workspace_write';
export type PendingRequestKind = 'command_approval' | 'file_change_approval' | 'user_input' | 'other';
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
export type TimelineEntryStatus = 'Running' | 'Completed' | 'Blocked' | 'Failed' | 'Cancelled';
export type TimelineOriginKind = 'parent_turn' | 'task_event' | 'child_turn';
export type TimelineLane = 'parent' | 'task' | 'child_agent' | 'child_tool' | 'child_reasoning' | 'child_result';
export type TurnPermissionAuditDecision =
  'allow' | 'ask' | 'deny' | 'allow_once' | 'allow_for_turn' | 'cancelled' | 'expired';
export type TurnPermissionAuditEventKind =
  | 'profile_selected'
  | 'security_snapshot_resolved'
  | 'security_sandbox_degraded'
  | 'security_sandbox_unavailable'
  | 'approval_requested'
  | 'approval_resolved'
  | 'decision_allowed'
  | 'decision_denied';
export type TurnPermissionProfileSource =
  'composer' | 'defaulted' | 'inherited_from_parent_turn' | 'task_permission_cap' | 'system';
export type PermissionBehavior = 'allow' | 'ask' | 'deny';
export type TurnPhase = 'Starting' | 'Running' | 'Completing' | 'Completed' | 'Blocked' | 'Failed' | 'Cancelled';
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
export type TimelineCoalescedToolsKind = 'CompletedTaskTools' | 'RepeatedTaskWait';
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
  'prompt_context' | 'thread_context' | 'prompt_section' | 'prompt_manifest_diagnostic' | 'runtime_failure';
export type PromptManifestHookTruncation = 'none' | 'hook' | 'prompt' | 'hook_and_prompt' | 'unknown';
export type PromptManifestProfile = 'assistant_full' | 'assistant_minimal' | 'assistant_none' | 'cli_runtime';
export type TurnStatus = 'InProgress' | 'Completed' | 'Failed' | 'Interrupted' | 'Blocked';
/**
 * User-selectable visibility for ordinary user threads.
 *
 * Internal task/system threads deliberately have no public selectable value.
 */
export type ThreadVisibility = 'private' | 'workspace';
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

export interface ClientActiveThreadEventResult {
  access_changed?: ClientAccessChangedLifecycle | null;
  administration_refetch?: AdministrationRefetch[];
  semantic_timeline_patch: SemanticTimelineCachePatch;
  snapshot: ClientActiveThreadSnapshot;
  /**
   * A live hint that the durable exact-recipient Task inbox changed. The
   * shell reconciles the inbox through the list RPC, including reconnect.
   */
  task_user_notification?: TaskUserNotificationDeliveredNotification | null;
  [k: string]: unknown;
}
/**
 * Payload-safe bridge projection of the shared Rust access-change plan.
 *
 * This lifecycle DTO omits thread identifiers and protected cache keys.
 * First-party shells may pair it with the minimal `AccessChangedNotification`
 * to evict an exact thread cache after access has been lost.
 */
export interface ClientAccessChangedLifecycle {
  active_scope_cleared: boolean;
  active_thread_cleared: boolean;
  applied: boolean;
  authorization_revision: number;
  change: AccessChangeKind;
  refresh_workspace_catalog: boolean;
  workspace_id: string;
  [k: string]: unknown;
}
export interface SemanticTimelineCachePatch {
  changed_blocks?: TimelineBlock[];
  changed_work_items?: TurnWorkItem[];
  removed_block_ids?: string[];
  removed_work_items?: SemanticTimelineRemovedWorkItem[];
  thread_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface TimelineBlock {
  blockId: string;
  kind: TimelineBlockKind;
  sortKey: string;
  startedAtUnixMs?: number | null;
  threadId: string;
  turnId?: string | null;
  updatedAtUnixMs?: number | null;
  workspaceId: string;
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
export interface TurnWorkBlock {
  afterCursor?: TimelineCursor | null;
  /**
   * Server-owned aggregate state for the root Agent work graph bound to
   * this Turn. Descendant Turns do not repeat the graph projection.
   */
  agentWorkGraph?: AgentWorkGraphProjection | null;
  /**
   * Exact execution whose work this row presents. This is separate from
   * the Turn input author and is required for stable Agent attribution.
   */
  author?: TurnAuthorSnapshot | null;
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
export interface TimelineCursor {
  value: string;
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
export interface TaskTurnItem {
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
  updatedAt: number;
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
export interface CLIRuntimePendingRequest {
  kind: CLIRuntimeRequestKind;
  message?: string | null;
  native_request_id?: string | null;
  payload?: unknown;
  title?: string | null;
  [k: string]: unknown;
}
export interface TurnWorkItem {
  completedAtUnixMs?: number | null;
  item: TurnItem;
  itemId: string;
  itemType: TurnItemType;
  metadata?: unknown;
  orderKey: string;
  sourceSequence?: number;
  sourceUpdatedAtUnixMicros?: number;
  startedAtUnixMs?: number | null;
  status: TurnWorkItemStatus;
  turnId: string;
  workItemId: string;
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
export interface SemanticTimelineRemovedWorkItem {
  turn_id: string;
  work_item_id: string;
  [k: string]: unknown;
}
export interface ClientActiveThreadSnapshot {
  active_turn_security_diagnostics?: ClientSecurityDiagnosticRow[];
  active_turn_security_summary?: ClientTurnSecuritySummary | null;
  draft_thread_id?: string | null;
  draft_workspace_id?: string | null;
  history_loaded: boolean;
  history_loading: boolean;
  last_active_thread_id?: string | null;
  pending_requests?: PendingRequest[];
  projection: ConversationViewState;
  row_render_fingerprints?: {
    [k: string]: string;
  };
  rows: TimelineRow[];
  session_revision?: number;
  thread?: Thread | null;
  thread_id?: string | null;
  workspace_id?: string | null;
  [k: string]: unknown;
}
export interface ClientSecurityDiagnosticRow {
  capability: TurnSecurityCapabilityKind;
  label: string;
  message: string;
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
  workspace_id: string;
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
export interface ConversationViewState {
  composer_locked: boolean;
  in_flight_turn_id?: string | null;
  items: ItemView[];
  last_error?: string | null;
  pending_request_id?: string | null;
  permission_audit?: PermissionAuditDisplayItem[];
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
  route?: SafeRouteProvenance | null;
  started_at_unix_ms?: number | null;
  status: TimelineEntryStatus;
  timeline_origin?: TimelineOrigin | null;
  turn_id: string;
  updated_at_unix_ms?: number | null;
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
export interface PermissionAuditDisplayItem {
  action_kind?: string | null;
  cached?: boolean;
  created_at_unix_ms: number;
  decision?: TurnPermissionAuditDecision | null;
  event_kind: TurnPermissionAuditEventKind;
  id: string;
  item_id?: string | null;
  profile_mode: TurnPermissionMode;
  profile_source: TurnPermissionProfileSource;
  reason?: string | null;
  request_scope_hash?: string | null;
  timeline_item_id?: string | null;
  tool_call_id?: string | null;
  tool_name?: string | null;
  turn_id: string;
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
  permission_profile?: TurnPermissionProfileSnapshot | null;
  phase: TurnPhase;
  resume?: TurnBlockedResumeMetadata | null;
  security_summary?: ClientTurnSecuritySummary | null;
  started_at_unix_ms?: number | null;
  [k: string]: unknown;
}
export interface TurnPermissionProfileSnapshot {
  effective_policy: ToolPermissionPolicySnapshot;
  mode: TurnPermissionMode;
  source: TurnPermissionProfileSource;
  [k: string]: unknown;
}
export interface ToolPermissionPolicySnapshot {
  allowed_paths?: string[];
  allowed_tools?: string[];
  computer_use: PermissionBehavior;
  default_behavior: PermissionBehavior;
  denied_tools?: string[];
  dynamic_skill_tool: PermissionBehavior;
  file_read: PermissionBehavior;
  file_write: PermissionBehavior;
  mcp_read: PermissionBehavior;
  mcp_write_or_unknown: PermissionBehavior;
  network: PermissionBehavior;
  shell_command: PermissionBehavior;
  task_subagent: PermissionBehavior;
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
  author?: TurnAuthorSnapshot | null;
  key: string;
  kind: TimelineRowKind;
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
export interface Thread {
  agent_nickname?: string | null;
  agent_role?: string | null;
  created_at: number;
  id: string;
  mode: ThreadMode;
  model: string;
  model_provider: string;
  name?: string | null;
  origin_kind?: ('task_run' | 'system') | 'collaborative' | 'direct_message' | 'user';
  preview: string;
  /**
   * Immutable author of the Turn that owns `preview`. Thread trees and
   * notifications must not pair preview text with the latest responding
   * execution or reconstruct this value from mutable agent settings.
   */
  preview_author?: TurnAuthorSnapshot | null;
  reasoning_effort?: string | null;
  sidebar_visibility?: 'visible' | 'hidden';
  status: ThreadStatus;
  turns: Turn[];
  updated_at: number;
  visibility?: ThreadVisibility | null;
  workspace_id: string;
  [k: string]: unknown;
}
export interface Turn {
  author?: TurnAuthorSnapshot | null;
  error?: string | null;
  id: string;
  mentions?: TurnMention[];
  message_deleted?: boolean;
  message_revision?: number;
  mode?: ('Message' | 'Agent') | 'Chat';
  origin?: 'user' | 'scheduled_task' | 'detached_task' | 'attached_task' | 'task_delivery';
  permission_profile: TurnPermissionProfileSnapshot;
  prompt_manifest?: PromptManifest | null;
  reply_to_turn_id?: string | null;
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
export interface TaskUserNotificationDeliveredNotification {
  /**
   * Exact immutable author of an agent-produced result. Scheduler/system
   * diagnostics leave this absent.
   */
  author?: AgentPresentationSnapshot | null;
  createdAt: number;
  /**
   * Canonical delivery receipt committed with the exact-recipient inbox
   * row. It is opaque to clients but preserves reconnect-safe provenance.
   */
  deliveryActionReceiptId?: string | null;
  deliveryId: string;
  error?: PublicTaskFailure | null;
  notificationId: string;
  recipientPrincipalId: string;
  result?: PublicTaskResult | null;
  runId: string;
  taskId: string;
  workspaceId: string;
  [k: string]: unknown;
}
export interface PublicTaskFailure {
  class: TaskErrorClass;
  error: PublicError;
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

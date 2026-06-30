/* eslint-disable */

export type ClientEvent =
  | {
      SnapshotChanged: ClientSnapshot;
    }
  | {
      GatewayConnectionChanged: ClientGatewayConnectionEvent;
    }
  | {
      GatewayNotification: GatewayNotification;
    }
  | {
      EffectsPlanned: ClientEffect[];
    }
  | {
      Error: ClientErrorEvent;
    };
export type ActiveThreadPhaseSnapshot =
  | 'Idle'
  | 'Starting'
  | 'Running'
  | 'Cancelling'
  | 'Completing'
  | 'Completed'
  | 'Failed'
  | 'Blocked'
  | 'Cancelled';
export type ActiveThreadStatusSnapshot =
  | (
      | 'GatewayDisconnected'
      | 'StartingThread'
      | 'FinishingTurn'
      | 'PreviousTurnFailed'
      | 'TurnCancelled'
      | 'TurnCompleted'
      | 'Ready'
      | 'StartingTurn'
      | 'AgentProcessing'
    )
  | {
      TurnRunning: {
        turn_id: string;
        [k: string]: unknown;
      };
    };
export type GatewayConnectionState = 'Idle' | 'Connecting' | 'Connected' | 'Reconnecting' | 'Disconnected';
export type GatewayNotification =
  | {
      kind: 'workspace_changed';
      params: WorkspaceChangedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'thread_started';
      params: ThreadStartedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'thread_closed';
      params: ThreadClosedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'thread_updated';
      params: ThreadUpdatedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'thread_tree_changed';
      params: ThreadTreeChangedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'thread_agents_doc_changed';
      params: ThreadAgentsDocChangedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'thread_timeline_blocks_changed';
      params: ThreadTimelineBlocksChangedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'turn_started';
      params: TurnStartedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'turn_completed';
      params: TurnCompletedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'turn_failed';
      params: TurnFailedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'turn_blocked';
      params: TurnBlockedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'turn_work_items_changed';
      params: TurnWorkItemsChangedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'turn_work_state_changed';
      params: TurnWorkStateChangedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'turn_permission_request_opened';
      params: TurnPermissionRequestOpenedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'turn_permission_request_resolved';
      params: TurnPermissionRequestResolvedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'turn_execution_window_started';
      params: TurnExecutionWindowStartedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'turn_execution_window_exhausted';
      params: TurnExecutionWindowExhaustedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'turn_execution_window_checkpointed';
      params: TurnExecutionWindowCheckpointedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'turn_execution_window_continued';
      params: TurnExecutionWindowContinuedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'turn_execution_window_blocked';
      params: TurnExecutionWindowBlockedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'item_started';
      params: ItemStartedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'item_delta';
      params: ItemDeltaNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'item_timeout_detected';
      params: ItemTimeoutDetectedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'item_recovery_opened';
      params: ItemRecoveryOpenedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'item_recovery_attached';
      params: ItemRecoveryAttachedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'item_retry_scheduled';
      params: ItemRetryScheduledNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'item_retry_attempt_started';
      params: ItemRetryAttemptStartedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'item_recovery_succeeded';
      params: ItemRecoverySucceededNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'item_recovery_exhausted';
      params: ItemRecoveryExhaustedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'item_tool_retry_scheduled';
      params: ItemToolRetryScheduledNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'item_tool_retry_resolved';
      params: ItemToolRetryResolvedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'item_tool_retry_exhausted';
      params: ItemToolRetryExhaustedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'item_completed';
      params: ItemCompletedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'item_updated';
      params: ItemUpdatedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'turn_tool_loop_budget_exceeded';
      params: TurnToolLoopBudgetExceededNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'context_compressing';
      params: ContextCompressingNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'context_compressed';
      params: ContextCompressedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'skills_changed';
      params: SkillsChangedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'skills_upload_chunk_ack';
      params: SkillsUploadChunkAckNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'mcp_changed';
      params: McpChangedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'mcp_server_status_changed';
      params: McpServerStatusChangedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'mcp_server_catalog_changed';
      params: McpServerCatalogChangedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'artifact_created';
      params: ArtifactCreatedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'artifact_updated';
      params: ArtifactUpdatedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'artifact_deleted';
      params: ArtifactDeletedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'thread_artifacts_changed';
      params: ThreadArtifactsChangedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'artifact_projection_updated';
      params: ArtifactProjectionUpdatedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'artifact_upload_progress';
      params: ArtifactUploadProgressNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'artifact_download_progress';
      params: ArtifactDownloadProgressNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_created';
      params: TaskCreatedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_scheduled';
      params: TaskScheduledNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_queued';
      params: TaskQueuedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_run_created';
      params: TaskRunCreatedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_run_started';
      params: TaskRunStartedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_progress';
      params: TaskProgressNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_run_completed';
      params: TaskRunCompletedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_run_failed';
      params: TaskRunFailedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_run_blocked';
      params: TaskRunFailedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_run_cancelled';
      params: TaskRunFailedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_completed';
      params: TaskCompletedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_failed';
      params: TaskFailedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_blocked';
      params: TaskFailedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_cancelled';
      params: TaskCancelledNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_detached';
      params: TaskDetachedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_updated';
      params: TaskUpdatedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_rescheduled';
      params: TaskRescheduledNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_paused';
      params: TaskPausedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_resumed';
      params: TaskResumedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_delivery_queued';
      params: TaskDeliveryQueuedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_delivery_started';
      params: TaskDeliveryStartedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_delivery_delivered';
      params: TaskDeliveryDeliveredNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_delivery_failed';
      params: TaskDeliveryFailedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_delivery_cancelled';
      params: TaskDeliveryCancelledNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_tree_changed';
      params: TaskTreeChangedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'task_recovered';
      params: TaskRecoveredNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'memory_changed';
      params: MemoryChangedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'memory_candidate_created';
      params: MemoryCandidateCreatedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'memory_forgotten';
      params: MemoryForgottenNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'cli_runtime_status_changed';
      params: CLIRuntimeStatusChangedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'cli_runtime_account_updated';
      params: CLIRuntimeAccountUpdatedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'cli_runtime_request_opened';
      params: CLIRuntimeRequestOpenedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'cli_runtime_request_resolved';
      params: CLIRuntimeRequestResolvedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'cli_runtime_apps_changed';
      params: CLIRuntimeAppsChangedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'gateway_remote_access_status_changed';
      params: GatewayRemoteAccessStatusChangedNotification;
      [k: string]: unknown;
    }
  | {
      kind: 'unknown';
      params: UnknownGatewayNotification;
      [k: string]: unknown;
    };
export type WorkspaceChangeKind = 'created' | 'updated' | 'current_changed';
export type ThreadMode = 'Chat' | 'Agent';
export type ThreadStatus = 'Active' | 'Idle' | 'Closed';
export type PermissionBehavior = 'allow' | 'ask' | 'deny';
export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';
export type TurnPermissionProfileSource =
  | 'composer'
  | 'defaulted'
  | 'inherited_from_parent_turn'
  | 'task_permission_cap'
  | 'system';
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
export type ThreadAgentsDocStatus = 'draft' | 'active' | 'archived';
export type TimelineChangeReason = 'backfill' | 'live_event' | 'state_changed' | 'page_invalidated';
export type TurnWorkPresentation = 'expanded_live' | 'collapsed_after_final' | 'expanded_terminal_no_final';
export type TurnWorkState =
  | 'starting'
  | 'running'
  | 'waiting_for_approval'
  | 'stalled'
  | 'completed'
  | 'blocked'
  | 'failed'
  | 'interrupted';
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
  | 'unknown_action_default';
export type TurnPermissionApprovalResolution = 'allow_once' | 'allow_for_turn' | 'deny' | 'cancelled' | 'expired';
export type ExecutionWindowStatus =
  | 'running'
  | 'exhausted'
  | 'checkpointed'
  | 'continued'
  | 'completed'
  | 'interrupted'
  | 'blocked'
  | 'failed';
export type ExecutionWindowExhaustionReason =
  | 'max_agent_rounds_per_window'
  | 'max_tool_calls_per_window'
  | 'max_wall_clock_ms_per_window'
  | 'max_provider_tokens_per_window'
  | 'provider_failure_continuation'
  | 'runtime_shutdown_continuation';
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
export type ItemDeltaStream = 'agent_message' | 'stdout' | 'stderr' | 'tool_progress' | 'file_change' | 'generic';
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
export type TurnItemTimeoutReason =
  | 'start_deadline_exceeded'
  | 'idle_deadline_exceeded'
  | 'hard_deadline_exceeded'
  | 'lease_expired';
export type RecoveryTrigger =
  | 'timeout'
  | 'provider_error'
  | 'turn_start'
  | 'turn_dispatch'
  | 'projection_failure'
  | 'execution_window_continuation'
  | 'artifact_finalization'
  | 'task_dispatch'
  | 'runtime_failure'
  | 'unknown';
export type RecoveryJobStatus = 'pending' | 'active' | 'succeeded' | 'failed' | 'exhausted' | 'blocked' | 'cancelled';
export type ToolRetryBudgetKind = 'episode' | 'error_class' | 'tool_name' | 'failure_signature';
export type ToolRetryErrorClass =
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
export type ToolRetryResolution = 'succeeded' | 'non_retryable';
export type ToolRetryExhaustionKind = 'total_retry_rounds' | 'error_class' | 'tool_name' | 'failure_signature';
export type ToolLoopBudgetAction = 'continue_in_next_window';
export type ToolLoopBudgetLimitKind = 'agent_rounds' | 'tool_calls' | 'provider_returned_tools_after_tools_disabled';
export type McpChangedAction = 'install' | 'policy' | 'update' | 'uninstall';
export type McpSourceKind = 'config';
export type McpRuntimeState =
  | 'not_started'
  | 'disabled'
  | 'starting'
  | 'ready'
  | 'degraded'
  | 'auth_required'
  | 'failed'
  | 'stopping'
  | 'stopped'
  | 'restarting';
export type McpServerStatus =
  | 'not_started'
  | 'disabled'
  | 'starting'
  | 'ready'
  | 'degraded'
  | 'auth_required'
  | 'failed'
  | 'stopping'
  | 'stopped'
  | 'restarting';
export type ArtifactBindingKind =
  | 'user_input'
  | 'agent_output'
  | 'tool_output'
  | 'task_result'
  | 'task_result_candidate'
  | 'context_attachment'
  | 'derived_from'
  | 'preview'
  | 'manual_attach'
  | 'draft_upload';
export type ArtifactBindingDirection = 'input' | 'output' | 'context' | 'derived';
export type ArtifactRole = 'user' | 'assistant' | 'tool' | 'system' | 'task';
export type ArtifactCreatedByKind = 'user' | 'agent' | 'tool' | 'task' | 'system' | 'import' | 'external_agent';
export type TaskConcurrencyConflictPolicy = 'queue' | 'reject' | 'cancel_existing' | 'allow';
export type TaskDeliveryFormat = 'summary' | 'full_result';
export type TaskDeliveryMode = 'none' | 'owner_thread' | 'thread' | 'user_notification' | 'webhook';
export type TaskErrorClass =
  | 'cancelled'
  | 'timeout'
  | 'provider'
  | 'tool'
  | 'validation'
  | 'dependency'
  | 'policy'
  | 'internal'
  | 'unknown';
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
export type TaskAttachmentMode = 'attached' | 'detached';
export type TaskCompletionBehavior = 'complete_on_terminal_run' | 'keep_active_for_recurring' | 'manual';
export type TaskParentTerminalAction = 'cancel' | 'detach' | 'keep_running';
export type TaskOwnerKind = 'user' | 'thread' | 'workspace' | 'system';
export type TaskRetryBackoffKind = 'none' | 'fixed' | 'exponential';
export type TaskTriggerSpec =
  | {
      kind: 'immediate';
      [k: string]: unknown;
    }
  | {
      catch_up_policy?: TaskTriggerCatchUpPolicy | null;
      kind: 'scheduled_at';
      scheduled_at: number;
      timezone?: string | null;
      [k: string]: unknown;
    }
  | {
      catch_up_policy?: TaskTriggerCatchUpPolicy | null;
      interval_anchor_at?: number | null;
      interval_seconds: number;
      kind: 'interval';
      [k: string]: unknown;
    }
  | {
      catch_up_policy?: TaskTriggerCatchUpPolicy | null;
      cron_expr: string;
      kind: 'cron';
      timezone: string;
      [k: string]: unknown;
    }
  | {
      allowed_actor?: TaskManualActor | null;
      kind: 'manual';
      [k: string]: unknown;
    }
  | {
      event_type?: string | null;
      filter?: TaskExternalTriggerFilter | null;
      kind: 'external';
      source: string;
      [k: string]: unknown;
    }
  | {
      kind: 'dependency';
      policy: TaskDependencyTriggerPolicy;
      [k: string]: unknown;
    };
export type TaskTriggerCatchUpMode = 'run_once_for_latest_missed' | 'skip_missed' | 'run_all_missed';
export type TaskManualActor = 'owner' | 'workspace_member' | 'system' | 'any';
export type TaskDependencyTriggerMode = 'all_succeeded' | 'any_succeeded' | 'all_terminal';
export type TaskTriggerStatus = 'active' | 'paused' | 'exhausted' | 'cancelled';
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
export type TaskAgentInputAttachmentKind = 'file' | 'artifact' | 'url';
export type TaskAgentInputReferenceKind = 'thread' | 'turn' | 'task' | 'task_run' | 'artifact';
export type TaskAgentContextMode = 'inherit_parent' | 'last_n_turns' | 'summary_only' | 'empty' | 'custom';
export type TaskAgentResultFormat = 'text' | 'markdown' | 'json' | 'artifact';
export type TaskAgentReviewMode = 'none' | 'parent_agent' | 'parent_agent_with_reviewers' | 'user_approval';
export type TaskResultReviewResolutionStrategy =
  | 'parent_final'
  | 'user_final'
  | 'require_all_required_reviewers_then_parent'
  | 'quorum_then_parent'
  | 'any_required_reviewer_can_request_changes';
export type TaskResultReviewerKind = 'runtime_auto' | 'parent_agent' | 'review_agent' | 'user' | 'system';
export type TaskAgentWriteMode = 'read_only' | 'workspace_write' | 'scoped_write' | 'full_access';
export type TaskRescheduleReason =
  | 'unknown'
  | 'user_requested'
  | 'trigger_fired'
  | 'missed_fire_skipped'
  | 'run_terminal_status_refresh'
  | 'task_cancelled';
export type TaskDeliveryStatus = 'pending' | 'delivering' | 'delivered' | 'failed' | 'cancelled';
export type TaskDeliveryAttemptStatus = 'started' | 'delivered' | 'failed';
export type MemoryChangeKind = 'created' | 'updated' | 'superseded' | 'deleted' | 'restored';
export type MemoryCategory =
  | 'identity'
  | 'preference'
  | 'biography'
  | 'relationship'
  | 'recurring_instruction'
  | 'project_policy'
  | 'project_fact'
  | 'project_decision'
  | 'procedure'
  | 'todo'
  | 'constraint'
  | 'communication_style'
  | 'custom';
export type MemoryActorKind = 'user' | 'assistant' | 'extractor' | 'system' | 'tool';
export type MemoryScopeKind = 'user' | 'workspace' | 'thread' | 'agent' | 'task';
export type MemorySensitivity = 'normal' | 'personal' | 'secret_like' | 'regulated';
export type MemorySourceContextKind =
  | 'direct_user_conversation'
  | 'assistant_response'
  | 'tool_result'
  | 'task_runtime'
  | 'system_runtime'
  | 'developer_instruction'
  | 'connector_content'
  | 'imported_document'
  | 'generated_summary'
  | 'unknown';
export type MemoryStatus = 'active' | 'superseded' | 'deleted' | 'expired';
export type MemoryCandidateStatus =
  | 'pending'
  | 'pending_silent'
  | 'ask_on_use'
  | 'needs_review'
  | 'approved'
  | 'rejected'
  | 'auto_rejected'
  | 'review_disabled_rejected'
  | 'superseded'
  | 'merged_duplicate'
  | 'expired';
export type RuntimeDiagnosticLevel = 'info' | 'warning' | 'error';
export type CLIAgentRuntimeKind = 'codex' | 'claude';
export type RuntimeStatus =
  | {
      state: 'disabled';
      [k: string]: unknown;
    }
  | {
      binary_path?: string | null;
      state: 'missing_binary';
      [k: string]: unknown;
    }
  | {
      message: string;
      state: 'spawn_failed';
      [k: string]: unknown;
    }
  | {
      state: 'initializing';
      [k: string]: unknown;
    }
  | {
      state: 'needs_auth';
      [k: string]: unknown;
    }
  | {
      state: 'ready';
      [k: string]: unknown;
    }
  | {
      message: string;
      state: 'degraded';
      [k: string]: unknown;
    }
  | {
      minimum_version?: string | null;
      state: 'unsupported_version';
      version?: string | null;
      [k: string]: unknown;
    }
  | {
      message: string;
      state: 'error';
      [k: string]: unknown;
    };
export type CLIRuntimeRequestKind = 'command_approval' | 'file_change_approval' | 'user_input' | 'other';
export type CLIRuntimeRequestResolution =
  | {
      status: 'approved';
      [k: string]: unknown;
    }
  | {
      reason?: string | null;
      status: 'denied';
      [k: string]: unknown;
    }
  | {
      status: 'cancelled';
      [k: string]: unknown;
    }
  | {
      response?: unknown;
      status: 'answered';
      [k: string]: unknown;
    }
  | {
      status: 'expired';
      [k: string]: unknown;
    }
  | {
      message: string;
      status: 'error';
      [k: string]: unknown;
    };
export type GatewayRemoteAccessErrorKind =
  | 'invalid_settings'
  | 'missing_key'
  | 'missing_binary'
  | 'local_gateway_unavailable'
  | 'relay_resolve_failed'
  | 'relay_connect_failed'
  | 'tunnel_auth_failed'
  | 'process_exited'
  | 'unsupported_transport'
  | 'restart_limit_reached'
  | 'io'
  | 'unknown';
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

export interface ClientActiveThreadEventRequest {
  event: ClientEvent;
  expanded_keys?: string[];
}
export interface ClientSnapshot {
  active_thread: ActiveThreadSnapshot;
  has_any_in_flight_turn: boolean;
  has_in_flight_thread_start: boolean;
  threads: ThreadListSnapshot;
  workspace: WorkspaceSnapshot;
  [k: string]: unknown;
}
export interface ActiveThreadSnapshot {
  history_loaded: boolean;
  history_loading: boolean;
  in_flight_turn_id?: string | null;
  is_draft: boolean;
  phase: ActiveThreadPhaseSnapshot;
  status: ActiveThreadStatusSnapshot;
  thread_id?: string | null;
  workspace_id?: string | null;
  [k: string]: unknown;
}
export interface ThreadListSnapshot {
  active_thread_id?: string | null;
  active_workspace_thread_ids: string[];
  draft_thread_id?: string | null;
  has_known_threads_for_active_workspace: boolean;
  loading: boolean;
  [k: string]: unknown;
}
export interface WorkspaceSnapshot {
  action_in_progress: boolean;
  active_workspace_id?: string | null;
  error?: string | null;
  loading: boolean;
  preferred_workspace_id?: string | null;
  workspace_count: number;
  [k: string]: unknown;
}
export interface ClientGatewayConnectionEvent {
  connection_state: GatewayConnectionState;
  gateway_error?: string | null;
  [k: string]: unknown;
}
export interface WorkspaceChangedNotification {
  kind: WorkspaceChangeKind;
  workspace: Workspace;
  [k: string]: unknown;
}
export interface Workspace {
  created_at: number;
  id: string;
  is_active: boolean;
  is_current: boolean;
  name: string;
  updated_at: number;
  [k: string]: unknown;
}
export interface ThreadStartedNotification {
  thread: Thread;
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
  permission_profile: TurnPermissionProfileSnapshot;
  prompt_manifest?: PromptManifest | null;
  status: TurnStatus;
  turn_kind?: 'conversation' | 'task_run';
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
export interface ThreadClosedNotification {
  threadId: string;
  workspaceId: string;
  [k: string]: unknown;
}
export interface ThreadUpdatedNotification {
  thread: Thread;
  [k: string]: unknown;
}
export interface ThreadTreeChangedNotification {
  workspace_id: string;
  [k: string]: unknown;
}
export interface ThreadAgentsDocChangedNotification {
  doc?: ThreadAgentsDocPayload | null;
  effective?: ThreadAgentsDocResolvedPayload | null;
  effective_changed: boolean;
  folder_id?: string | null;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ThreadAgentsDocPayload {
  content: string;
  content_sha256: string;
  created_at: number;
  folder_id?: string | null;
  id: string;
  status: ThreadAgentsDocStatus;
  title: string;
  updated_at: number;
  version: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ThreadAgentsDocResolvedPayload {
  doc: ThreadAgentsDocPayload;
  inherited: boolean;
  resolved_at: number;
  resolved_for_folder_id?: string | null;
  source_folder_id?: string | null;
  source_path?: string[];
  [k: string]: unknown;
}
export interface ThreadTimelineBlocksChangedNotification {
  afterCursor?: TimelineCursor | null;
  beforeCursor?: TimelineCursor | null;
  changedBlockIds?: string[];
  reason: TimelineChangeReason;
  removedBlockIds?: string[];
  threadId: string;
  workspaceId: string;
  [k: string]: unknown;
}
export interface TimelineCursor {
  value: string;
  [k: string]: unknown;
}
export interface TurnStartedNotification {
  thread_id: string;
  turn: Turn;
  workspace_id: string;
  [k: string]: unknown;
}
export interface TurnCompletedNotification {
  thread_id: string;
  turn: Turn;
  workspace_id: string;
  [k: string]: unknown;
}
export interface TurnFailedNotification {
  thread_id: string;
  turn: Turn;
  workspace_id: string;
  [k: string]: unknown;
}
export interface TurnBlockedNotification {
  resume?: TurnBlockedResumeMetadata | null;
  thread_id: string;
  turn: Turn;
  workspace_id: string;
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
export interface TurnWorkItemsChangedNotification {
  afterCursor?: TimelineCursor | null;
  beforeCursor?: TimelineCursor | null;
  changedWorkItemIds?: string[];
  reason: TimelineChangeReason;
  removedWorkItemIds?: string[];
  threadId: string;
  turnId: string;
  workspaceId: string;
  [k: string]: unknown;
}
export interface TurnWorkStateChangedNotification {
  reason: TimelineChangeReason;
  threadId: string;
  turnId: string;
  work: TurnWorkBlock;
  workspaceId: string;
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
export interface TurnPermissionRequestOpenedNotification {
  request: TurnPermissionApprovalRequest;
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
  workspace_id: string;
  [k: string]: unknown;
}
export interface TurnPermissionApprovalRequestDetail {
  label: string;
  monospace?: boolean;
  value: string;
  [k: string]: unknown;
}
export interface TurnPermissionRequestResolvedNotification {
  request_id: string;
  resolution: TurnPermissionApprovalResolution;
  thread_id: string;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface TurnExecutionWindowStartedNotification {
  started_at_unix_ms: number;
  status: ExecutionWindowStatus;
  thread_id: string;
  turn_id: string;
  window_id: string;
  window_index: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface TurnExecutionWindowExhaustedNotification {
  agent_round_count: number;
  exhausted_at_unix_ms: number;
  exhaustion_reason: ExecutionWindowExhaustionReason;
  limit: number;
  observed: number;
  provider_token_count?: number | null;
  reason: string;
  started_at_unix_ms: number;
  status: ExecutionWindowStatus;
  thread_id: string;
  tool_call_count: number;
  turn_id: string;
  window_id: string;
  window_index: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface TurnExecutionWindowCheckpointedNotification {
  checkpoint_id: string;
  checkpoint_kind: string;
  created_at_unix_ms: number;
  payload_bytes: number;
  status: ExecutionWindowStatus;
  thread_id: string;
  turn_id: string;
  window_id: string;
  window_index: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface TurnExecutionWindowContinuedNotification {
  checkpoint_id: string;
  continued_at_unix_ms: number;
  previous_window_id: string;
  previous_window_index: number;
  status: ExecutionWindowStatus;
  thread_id: string;
  turn_id: string;
  window_id: string;
  window_index: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface TurnExecutionWindowBlockedNotification {
  blocked_at_unix_ms: number;
  checkpoint_id?: string | null;
  exhaustion_reason?: ExecutionWindowExhaustionReason | null;
  reason: string;
  status: ExecutionWindowStatus;
  thread_id: string;
  total_tool_calls: number;
  total_windows: number;
  turn_id: string;
  window_id: string;
  window_index: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ItemStartedNotification {
  item: TurnItem;
  thread_id: string;
  turn_id: string;
  workspace_id: string;
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
export interface ItemDeltaNotification {
  delta: string;
  item_id: string;
  markdown?: MarkdownDocument | null;
  markdown_version?: number | null;
  payload?: unknown;
  stream?: ItemDeltaStream | null;
  thread_id: string;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ItemTimeoutDetectedNotification {
  attempt_number: number;
  item_id: string;
  item_type: TurnItemType;
  reason: TurnItemTimeoutReason;
  recovery_job_id?: string | null;
  thread_id: string;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ItemRecoveryOpenedNotification {
  action: RecoveryAction;
  attempt_number: number;
  item_id: string;
  item_type: TurnItemType;
  recovery_job_id: string;
  thread_id: string;
  trigger: RecoveryTrigger;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ItemRecoveryAttachedNotification {
  action: RecoveryAction;
  existing_status: RecoveryJobStatus;
  item_id: string;
  item_type: TurnItemType;
  next_attempt_number: number;
  recovery_item_id: string;
  recovery_item_type: TurnItemType;
  recovery_job_id: string;
  thread_id: string;
  trigger: RecoveryTrigger;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ItemRetryScheduledNotification {
  attempt_number: number;
  item_id: string;
  item_type: TurnItemType;
  next_run_at_unix: number;
  reason?: string | null;
  recovery_job_id: string;
  thread_id: string;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ItemRetryAttemptStartedNotification {
  attempt_number: number;
  item_id: string;
  item_type: TurnItemType;
  recovery_job_id: string;
  thread_id: string;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ItemRecoverySucceededNotification {
  attempt_number: number;
  item_id: string;
  item_type: TurnItemType;
  recovery_job_id: string;
  thread_id: string;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ItemRecoveryExhaustedNotification {
  attempt_number: number;
  error_message: string;
  item_id: string;
  item_type: TurnItemType;
  recovery_job_id: string;
  status: RecoveryJobStatus;
  thread_id: string;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ItemToolRetryScheduledNotification {
  attempt_number: number;
  budgets?: ToolRetryBudgetUsage[];
  error_class: ToolRetryErrorClass;
  failure_signature_fingerprint: string;
  item_id: string;
  item_type: TurnItemType;
  reason: string;
  retry_hint: string;
  thread_id: string;
  tool_name: string;
  tool_retry_episode_id: string;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ToolRetryBudgetUsage {
  kind: ToolRetryBudgetKind;
  limit: number;
  used: number;
  [k: string]: unknown;
}
export interface ItemToolRetryResolvedNotification {
  attempt_number: number;
  budgets?: ToolRetryBudgetUsage[];
  item_id: string;
  item_type: TurnItemType;
  reason: string;
  resolution: ToolRetryResolution;
  thread_id: string;
  tool_name: string;
  tool_retry_episode_id: string;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ItemToolRetryExhaustedNotification {
  attempt_number: number;
  budgets?: ToolRetryBudgetUsage[];
  error_class: ToolRetryErrorClass;
  exhaustion_kind: ToolRetryExhaustionKind;
  failure_signature_fingerprint: string;
  item_id: string;
  item_type: TurnItemType;
  reason: string;
  thread_id: string;
  tool_name: string;
  tool_retry_episode_id: string;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ItemCompletedNotification {
  item: TurnItem;
  thread_id: string;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ItemUpdatedNotification {
  item: TurnItem;
  thread_id: string;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface TurnToolLoopBudgetExceededNotification {
  action: ToolLoopBudgetAction;
  limit: number;
  limit_kind: ToolLoopBudgetLimitKind;
  observed: number;
  reason: string;
  thread_id: string;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ContextCompressingNotification {
  message: string;
  thread_id: string;
  turn_id: string;
  [k: string]: unknown;
}
export interface ContextCompressedNotification {
  compressed_tokens: number;
  thread_id: string;
  turn_id: string;
  [k: string]: unknown;
}
export interface SkillsChangedNotification {
  changes?: SkillChangedItem[];
  created_at: number;
  reason: string;
  snapshot_version: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface SkillChangedItem {
  change_type: string;
  fingerprint_after?: string | null;
  fingerprint_before?: string | null;
  slug: string;
  source_kind: string;
  [k: string]: unknown;
}
export interface SkillsUploadChunkAckNotification {
  len: number;
  next_offset: number;
  offset: number;
  received_bytes: number;
  upload_id: string;
  [k: string]: unknown;
}
export interface McpChangedNotification {
  changed?: McpChangedItem[];
  snapshot_version: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface McpChangedItem {
  action: McpChangedAction;
  name: string;
  source_kind: McpSourceKind;
  [k: string]: unknown;
}
export interface McpServerStatusChangedNotification {
  server: McpServerStatusItem;
  snapshot_version: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface McpServerStatusItem {
  id: string;
  name: string;
  runtime: McpRuntimeStatus;
  scope_kind: McpScopeKind;
  status: McpServerStatus;
  status_reason?: string | null;
  [k: string]: unknown;
}
export interface McpRuntimeStatus {
  last_error?: string | null;
  last_seen_at?: number | null;
  live: boolean;
  state: McpRuntimeState;
  [k: string]: unknown;
}
export interface McpServerCatalogChangedNotification {
  catalog_version: string;
  name: string;
  prompts_count: number;
  resource_templates_count: number;
  resources_count: number;
  server_id: string;
  snapshot_version: number;
  tools_count: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ArtifactCreatedNotification {
  artifact: ArtifactSummary;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ArtifactSummary {
  artifact: ArtifactRef;
  bindings?: ArtifactBindingSummary[];
  created_at: number;
  created_by_actor_id?: string | null;
  created_by_kind: ArtifactCreatedByKind;
  metadata?: {
    [k: string]: unknown;
  };
  primary_thread_id?: string | null;
  updated_at: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ArtifactBindingSummary {
  binding_id: string;
  binding_kind: ArtifactBindingKind;
  created_at: number;
  direction: ArtifactBindingDirection;
  item_index?: number | null;
  message_id?: string | null;
  role?: ArtifactRole | null;
  task_id?: string | null;
  task_run_id?: string | null;
  thread_id?: string | null;
  tool_call_id?: string | null;
  turn_id?: string | null;
  turn_item_id?: string | null;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ArtifactUpdatedNotification {
  artifact: ArtifactSummary;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ArtifactDeletedNotification {
  artifact_id: string;
  deleted_at: number;
  status: ArtifactStatus;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ThreadArtifactsChangedNotification {
  artifact_ids?: string[];
  generated_at: number;
  reason: string;
  thread_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ArtifactProjectionUpdatedNotification {
  artifact_id: string;
  projection_kind: ArtifactProjectionKind;
  status: ArtifactProjectionStatus;
  updated_at: number;
  version_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ArtifactUploadProgressNotification {
  next_offset: number;
  received_bytes: number;
  total_size_bytes: number;
  upload_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ArtifactDownloadProgressNotification {
  artifact_id: string;
  download_id: string;
  received_bytes: number;
  total_size_bytes: number;
  workspace_id: string;
  [k: string]: unknown;
}
export interface TaskCreatedNotification {
  context: TaskNotificationContext;
  task: Task;
  [k: string]: unknown;
}
export interface TaskNotificationContext {
  eventId: string;
  parentTaskId?: string | null;
  rootTaskId?: string | null;
  runId?: string | null;
  sequence: number;
  taskId: string;
  threadId?: string | null;
  turnId?: string | null;
  workspaceId: string;
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
export interface TaskError {
  class: TaskErrorClass;
  code: string;
  details?: TaskValue | null;
  failedRunId?: string | null;
  message: string;
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
  data?: TaskValue | null;
  labels?: string[];
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
export interface TaskScheduledNotification {
  context: TaskNotificationContext;
  trigger: TaskTrigger;
  [k: string]: unknown;
}
export interface TaskTrigger {
  createdAt: number;
  id: string;
  lastFireAt?: number | null;
  nextFireAt?: number | null;
  spec: TaskTriggerSpec;
  status: TaskTriggerStatus;
  taskId: string;
  updatedAt: number;
  [k: string]: unknown;
}
export interface TaskTriggerCatchUpPolicy {
  maxCount?: number | null;
  mode: TaskTriggerCatchUpMode;
  [k: string]: unknown;
}
export interface TaskExternalTriggerFilter {
  expression?: string | null;
  fields?: {
    [k: string]: TaskValue;
  };
  [k: string]: unknown;
}
export interface TaskDependencyTriggerPolicy {
  dependsOnTaskIds?: string[];
  mode: TaskDependencyTriggerMode;
  [k: string]: unknown;
}
export interface TaskQueuedNotification {
  context: TaskNotificationContext;
  run?: TaskRun | null;
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
export interface TaskRunCreatedNotification {
  context: TaskNotificationContext;
  run: TaskRun;
  [k: string]: unknown;
}
export interface TaskRunStartedNotification {
  context: TaskNotificationContext;
  run: TaskRun;
  [k: string]: unknown;
}
export interface TaskProgressNotification {
  context: TaskNotificationContext;
  details?: TaskProgressDetails | null;
  message: string;
  [k: string]: unknown;
}
export interface TaskProgressDetails {
  data?: TaskValue | null;
  percent?: number | null;
  stage?: string | null;
  [k: string]: unknown;
}
export interface TaskRunCompletedNotification {
  context: TaskNotificationContext;
  run: TaskRun;
  [k: string]: unknown;
}
export interface TaskRunFailedNotification {
  context: TaskNotificationContext;
  run: TaskRun;
  [k: string]: unknown;
}
export interface TaskCompletedNotification {
  context: TaskNotificationContext;
  task: Task;
  [k: string]: unknown;
}
export interface TaskFailedNotification {
  context: TaskNotificationContext;
  task: Task;
  [k: string]: unknown;
}
export interface TaskCancelledNotification {
  context: TaskNotificationContext;
  task: Task;
  [k: string]: unknown;
}
export interface TaskDetachedNotification {
  context: TaskNotificationContext;
  task: Task;
  [k: string]: unknown;
}
export interface TaskUpdatedNotification {
  agentSpec?: TaskAgentSpec | null;
  changedFields?: string[];
  context: TaskNotificationContext;
  task: Task;
  trigger?: TaskTrigger | null;
  [k: string]: unknown;
}
export interface TaskAgentSpec {
  agentNickname?: string | null;
  agentRole?: string | null;
  contextPolicy?: TaskAgentContextPolicy | null;
  createdAt: number;
  depth: number;
  id: string;
  maxDepth: number;
  model?: string | null;
  modelProvider?: string | null;
  permissionCap?: TurnPermissionProfileCap | null;
  prompt: TaskAgentPrompt;
  resultContract?: TaskAgentResultContract | null;
  reviewPolicy?: TaskAgentReviewPolicy | null;
  runId?: string | null;
  taskId: string;
  toolPolicy?: TaskAgentToolPolicy | null;
  updatedAt: number;
  [k: string]: unknown;
}
export interface TaskAgentContextPolicy {
  customContext?: TaskAgentContext | null;
  includeArtifacts: boolean;
  includeParentSummary: boolean;
  maxTurns?: number | null;
  mode: TaskAgentContextMode;
  [k: string]: unknown;
}
export interface TaskAgentContext {
  attachments?: TaskAgentInputAttachment[];
  references?: TaskAgentInputReference[];
  text?: string | null;
  variables?: TaskAgentInputVariable[];
  [k: string]: unknown;
}
export interface TaskAgentInputAttachment {
  artifactId?: string | null;
  kind: TaskAgentInputAttachmentKind;
  mimeType?: string | null;
  name?: string | null;
  path?: string | null;
  url?: string | null;
  [k: string]: unknown;
}
export interface TaskAgentInputReference {
  id: string;
  kind: TaskAgentInputReferenceKind;
  label?: string | null;
  [k: string]: unknown;
}
export interface TaskAgentInputVariable {
  name: string;
  value: TaskValue;
  [k: string]: unknown;
}
export interface TurnPermissionProfileCap {
  effective_policy: ToolPermissionPolicySnapshot;
  mode: TurnPermissionMode;
  [k: string]: unknown;
}
export interface TaskAgentPrompt {
  goal: string;
  input?: TaskAgentInput | null;
  instructions?: string[];
  outputInstructions?: string | null;
  [k: string]: unknown;
}
export interface TaskAgentInput {
  attachments?: TaskAgentInputAttachment[];
  references?: TaskAgentInputReference[];
  text?: string | null;
  variables?: TaskAgentInputVariable[];
  [k: string]: unknown;
}
export interface TaskAgentResultContract {
  format: TaskAgentResultFormat;
  required: boolean;
  schema?: TaskSchema | null;
  [k: string]: unknown;
}
export interface TaskSchema {
  description?: string | null;
  name?: string | null;
  schema: TaskValue;
  [k: string]: unknown;
}
export interface TaskAgentReviewPolicy {
  maxRevisionRounds: number;
  mode: TaskAgentReviewMode;
  requireExplicitAcceptance: boolean;
  resolutionStrategy: TaskResultReviewResolutionStrategy;
  reviewers?: TaskResultReviewerSpec[];
  [k: string]: unknown;
}
export interface TaskResultReviewerSpec {
  agentNickname?: string | null;
  agentRole?: string | null;
  required: boolean;
  reviewerKind: TaskResultReviewerKind;
  weight?: number | null;
  [k: string]: unknown;
}
export interface TaskAgentToolPolicy {
  allowedPaths?: string[];
  allowedTools?: string[];
  deniedTools?: string[];
  networkAccess: boolean;
  writeMode: TaskAgentWriteMode;
  [k: string]: unknown;
}
export interface TaskRescheduledNotification {
  context: TaskNotificationContext;
  reason: TaskRescheduleReason;
  trigger: TaskTrigger;
  [k: string]: unknown;
}
export interface TaskPausedNotification {
  context: TaskNotificationContext;
  reason?: string | null;
  task: Task;
  triggers?: TaskTrigger[];
  [k: string]: unknown;
}
export interface TaskResumedNotification {
  context: TaskNotificationContext;
  reason?: string | null;
  task: Task;
  triggers?: TaskTrigger[];
  [k: string]: unknown;
}
export interface TaskDeliveryQueuedNotification {
  childThreadId?: string | null;
  childTurnId?: string | null;
  context: TaskNotificationContext;
  delivery: TaskDelivery;
  errorPreview?: string | null;
  summary?: string | null;
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
export interface TaskDeliveryStartedNotification {
  attempt: TaskDeliveryAttempt;
  context: TaskNotificationContext;
  delivery: TaskDelivery;
  [k: string]: unknown;
}
export interface TaskDeliveryAttempt {
  attemptNumber: number;
  completedAt?: number | null;
  deliveryId: string;
  error?: string | null;
  httpStatus?: number | null;
  id: string;
  responseFingerprint?: string | null;
  startedAt: number;
  status: TaskDeliveryAttemptStatus;
  [k: string]: unknown;
}
export interface TaskDeliveryDeliveredNotification {
  attempt: TaskDeliveryAttempt;
  context: TaskNotificationContext;
  delivery: TaskDelivery;
  [k: string]: unknown;
}
export interface TaskDeliveryFailedNotification {
  attempt: TaskDeliveryAttempt;
  context: TaskNotificationContext;
  delivery: TaskDelivery;
  [k: string]: unknown;
}
export interface TaskDeliveryCancelledNotification {
  context: TaskNotificationContext;
  delivery: TaskDelivery;
  reason?: string | null;
  [k: string]: unknown;
}
export interface TaskTreeChangedNotification {
  context: TaskNotificationContext;
  [k: string]: unknown;
}
export interface TaskRecoveredNotification {
  context: TaskNotificationContext;
  recoveredAt: number;
  [k: string]: unknown;
}
export interface MemoryChangedNotification {
  change_kind: MemoryChangeKind;
  memory_id: string;
  record?: MemoryRecord | null;
  scope: MemoryScope;
  [k: string]: unknown;
}
export interface MemoryRecord {
  access_count?: number;
  category: MemoryCategory;
  confidence: number;
  content: string;
  created_at: number;
  delete_reason?: string | null;
  deleted_at?: number | null;
  expires_at?: number | null;
  id: string;
  importance: number;
  key?: string | null;
  last_accessed_at?: number | null;
  metadata?: {
    [k: string]: unknown;
  };
  namespace?: string | null;
  provenance: MemoryProvenance;
  scope: MemoryScope;
  sensitivity: MemorySensitivity;
  source_context_kind?: MemorySourceContextKind | null;
  status: MemoryStatus;
  superseded_by?: string | null;
  updated_at: number;
  [k: string]: unknown;
}
export interface MemoryProvenance {
  created_by?: MemoryActor | null;
  source_item_id?: string | null;
  source_thread_id?: string | null;
  source_turn_id?: string | null;
  [k: string]: unknown;
}
export interface MemoryActor {
  id?: string | null;
  kind: MemoryActorKind;
  [k: string]: unknown;
}
export interface MemoryScope {
  key: string;
  kind: MemoryScopeKind;
  [k: string]: unknown;
}
export interface MemoryCandidateCreatedNotification {
  candidate: MemoryCandidate;
  [k: string]: unknown;
}
export interface MemoryCandidate {
  candidate_text: string;
  category: MemoryCategory;
  confidence: number;
  created_at: number;
  decided_at?: number | null;
  decision_reason?: string | null;
  id: string;
  key?: string | null;
  metadata?: {
    [k: string]: unknown;
  };
  provenance: MemoryProvenance;
  reason: string;
  scope: MemoryScope;
  source_context_kind?: MemorySourceContextKind | null;
  status: MemoryCandidateStatus;
  [k: string]: unknown;
}
export interface MemoryForgottenNotification {
  memory_ids?: string[];
  reason?: string | null;
  [k: string]: unknown;
}
export interface CLIRuntimeStatusChangedNotification {
  runtime: RuntimeSummary;
  workspace_id: string;
  [k: string]: unknown;
}
export interface RuntimeSummary {
  account?: RuntimeAccountSnapshot | null;
  binary_path?: string | null;
  capabilities: RuntimeCapabilities;
  debug_native_events_enabled?: boolean;
  diagnostics?: RuntimeDiagnostic[];
  display_name: string;
  enabled: boolean;
  home_path?: string | null;
  kind: CLIAgentRuntimeKind;
  models_refreshed_at_unix_ms?: number | null;
  recent_stderr?: string[];
  runtime_id: string;
  shadow_home_path?: string | null;
  status: RuntimeStatus;
  version?: string | null;
  [k: string]: unknown;
}
export interface RuntimeAccountSnapshot {
  account_id?: string | null;
  auth_method?: string | null;
  authenticated: boolean;
  display_name?: string | null;
  email?: string | null;
  plan?: string | null;
  [k: string]: unknown;
}
export interface RuntimeCapabilities {
  supports_approvals: boolean;
  supports_apps: boolean;
  supports_auth_management: boolean;
  supports_command_approvals: boolean;
  supports_compaction: boolean;
  supports_diff_updates: boolean;
  supports_file_change_approvals: boolean;
  supports_fork: boolean;
  supports_generated_schema_probe: boolean;
  supports_goal: boolean;
  supports_history_read: boolean;
  supports_interrupt: boolean;
  supports_model_list: boolean;
  supports_resume: boolean;
  supports_review: boolean;
  supports_steer: boolean;
  supports_thread_archive: boolean;
  supports_threads: boolean;
  supports_user_input_requests: boolean;
  [k: string]: unknown;
}
export interface RuntimeDiagnostic {
  code: string;
  level: RuntimeDiagnosticLevel;
  message: string;
  [k: string]: unknown;
}
export interface CLIRuntimeAccountUpdatedNotification {
  account?: RuntimeAccountSnapshot | null;
  kind?: CLIAgentRuntimeKind | null;
  runtime_id: string;
  status: RuntimeStatus;
  workspace_id: string;
  [k: string]: unknown;
}
export interface CLIRuntimeRequestOpenedNotification {
  item_id?: string | null;
  request: CLIRuntimePendingRequest;
  request_id: string;
  runtime_id: string;
  thread_id?: string | null;
  turn_id?: string | null;
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
export interface CLIRuntimeRequestResolvedNotification {
  item_id?: string | null;
  request_id: string;
  resolution: CLIRuntimeRequestResolution;
  runtime_id: string;
  thread_id?: string | null;
  turn_id?: string | null;
  workspace_id: string;
  [k: string]: unknown;
}
export interface CLIRuntimeAppsChangedNotification {
  apps: RuntimeAppInfo[];
  refreshed_at_unix_ms?: number | null;
  runtime_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface RuntimeAppInfo {
  account_label?: string | null;
  description?: string | null;
  enabled?: boolean;
  id: string;
  name: string;
  payload?: unknown;
  status?: string | null;
  [k: string]: unknown;
}
export interface GatewayRemoteAccessStatusChangedNotification {
  status: GatewayRemoteAccessStatusSnapshot;
  [k: string]: unknown;
}
export interface GatewayRemoteAccessStatusSnapshot {
  error_kind?: GatewayRemoteAccessErrorKind | null;
  message?: string | null;
  state?: 'disabled' | 'starting' | 'connected' | 'reconnecting' | 'failed' | 'stopped';
  updated_at_unix?: number | null;
  [k: string]: unknown;
}
export interface UnknownGatewayNotification {
  item_id?: string | null;
  method: string;
  params: unknown;
  thread_id?: string | null;
  turn_id?: string | null;
  workspace_id?: string | null;
  [k: string]: unknown;
}
export interface ClientErrorEvent {
  code?: string | null;
  message: string;
  [k: string]: unknown;
}

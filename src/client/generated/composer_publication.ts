/* eslint-disable */

export type ComposerAttachmentKind = 'Image' | 'File' | 'Audio' | 'Video';
export type ComposerAttachmentUploadState =
  | ('Local' | 'Uploading')
  | {
      Uploaded: {
        artifact: ArtifactRef;
        [k: string]: unknown;
      };
    }
  | {
      Failed: {
        error: string;
        [k: string]: unknown;
      };
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
export type ComposerCapabilityKind =
  | {
      Skill: {
        owner?: string | null;
        skill_id: SkillId;
        slug: string;
        source_kind: string;
        [k: string]: unknown;
      };
    }
  | {
      McpServer: {
        name: string;
        scope_kind: McpScopeKind;
        [k: string]: unknown;
      };
    }
  | {
      McpTool: {
        raw_tool_name: string;
        scope_kind: McpScopeKind;
        server_name: string;
        [k: string]: unknown;
      };
    };
export type SkillId = string;
export type McpScopeKind = 'workspace' | 'user';
export type ComposerCapabilityTargetKind = 'native' | 'cli';
export type PrincipalId = string;
export type ComposerSkillSelection =
  | {
      kind: 'skill';
      pack_id?: SkillPackId | null;
      skill_id: SkillId;
      [k: string]: unknown;
    }
  | {
      kind: 'skill_pack';
      pack_id: SkillPackId;
      [k: string]: unknown;
    };
export type SkillPackId = string;
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
export type AgentExecutionId = string;
export type AgentIdentityId = string;
export type AgentIdentitySourceKind = 'native_agent' | 'cli_runtime_instance' | 'ephemeral';
export type ThreadMode = ('Message' | 'Agent') | 'Chat';
export type TimelineReplyState = 'available' | 'deleted' | 'unavailable';
export type AgentRouteAction =
  'send_message' | 'start_agent' | 'create_task' | 'schedule_task' | 'review_task_result' | 'deliver_result';
export type CrossThreadSourceVisibility = 'accessible' | 'inaccessible';
export type ComposerModelDisplayRequestState =
  | {
      kind: 'loading';
      [k: string]: unknown;
    }
  | {
      kind: 'ready';
      [k: string]: unknown;
    }
  | {
      kind: 'failed';
      message: string;
      [k: string]: unknown;
    }
  | {
      kind: 'cancelled';
      [k: string]: unknown;
    };
export type ComposerOperationKind = 'send' | 'edit_message' | 'steer' | 'voice' | 'pick_files' | 'pick_media';
export type ComposerOperationStatus =
  | {
      kind: 'starting_capture';
      [k: string]: unknown;
    }
  | {
      kind: 'pending';
      [k: string]: unknown;
    }
  | {
      kind: 'preparing';
      [k: string]: unknown;
    }
  | {
      kind: 'uploading';
      [k: string]: unknown;
    }
  | {
      kind: 'prepared';
      [k: string]: unknown;
    }
  | {
      kind: 'sending';
      [k: string]: unknown;
    }
  | {
      kind: 'failed';
      message: string;
      [k: string]: unknown;
    }
  | {
      kind: 'cancelled';
      [k: string]: unknown;
    }
  | {
      kind: 'completed';
      [k: string]: unknown;
    };
export type ComposerVoiceCapturePreflightState = 'checking' | 'ready';
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
export type TurnPermissionMode = 'full_access' | 'auto_accept_edits' | 'supervised';
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
export type SandboxMode = 'FullAccess';
export type VoiceFinalizeUiAction =
  'keep_finalizing' | 'clear_finalizing' | 'show_no_speech_error' | 'show_finalize_error';
export type VoiceStatus =
  | ('disabled' | 'unavailable' | 'model_loading' | 'ready' | 'busy' | 'recording' | 'transcribing' | 'error')
  | 'model_downloading';
export type VoiceErrorKind =
  | 'model_unavailable'
  | 'microphone_permission_blocked'
  | 'device_unavailable'
  | 'invalid_session'
  | 'stale_chunk'
  | 'sequence_gap'
  | 'cancelled'
  | 'no_speech'
  | 'transcription_failed'
  | 'gateway_busy'
  | 'model_downloading'
  | 'unknown';
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
export type VoiceSessionOutcome = 'turn_started' | 'cancelled' | 'no_speech' | 'failed';
export type ExecutionDraftReconciliationKind =
  'policy_generation' | 'provider' | 'model' | 'permission_mode' | 'skill' | 'mcp_server' | 'attachment';
export type ComposerCatalogRequestState =
  | {
      kind: 'idle';
      [k: string]: unknown;
    }
  | {
      kind: 'loading';
      [k: string]: unknown;
    }
  | {
      kind: 'ready';
      [k: string]: unknown;
    }
  | {
      kind: 'failed';
      message: string;
      [k: string]: unknown;
    }
  | {
      kind: 'cancelled';
      [k: string]: unknown;
    };
export type ComposerVoiceReadinessDemand = 'suspended' | 'until_ready' | 'while_visible';

export interface ComposerPublication {
  authorization_fingerprint?: string | null;
  draft: ComposerDomainDraft;
  draft_id: number;
  execution_capabilities_removed: boolean;
  message_edit?: ComposerMessageEditTarget | null;
  model_display?: ComposerModelDisplayPublication | null;
  operation?: ComposerOperationPublication | null;
  permission_options: ComposerPermissionModeOption[];
  reconciliation?: ExecutionDraftReconciliation | null;
  revision: number;
  runtime_selection?: ComposerRuntimePublication | null;
  selected_permission_mode_allowed: boolean;
  selected_provider_ready: boolean;
  thread_id: string;
  voice_readiness?: ComposerVoiceReadinessPublication | null;
  [k: string]: unknown;
}
/**
 * Complete, shell-neutral draft payload used by desktop and mobile.
 *
 * Hot editor state (cursor, IME composition, focus, keyboard, sheets) is not
 * part of this value. Client owns the text; shells publish user edits and
 * apply controlled publications without moving cursor or IME state into Client.
 */
export interface ComposerDomainDraft {
  domain: ComposerDomainState;
  text?: string;
}
export interface ComposerDomainState {
  attachments?: ComposerAttachment[];
  capabilities?: ComposerCapability[];
  capability_target: ComposerCapabilityTarget;
  mode_manually_selected?: boolean;
  model_manually_selected?: boolean;
  reply_target?: ComposerReplyTarget | null;
  selected_mentions?: ComposerMentionSelection[];
  selected_mode?: ('Message' | 'Agent') | 'Chat';
  selected_model?: string | null;
  selected_permission_mode?: 'full_access' | 'auto_accept_edits' | 'supervised';
  selected_provider?: string | null;
  selected_reasoning_effort?: string | null;
  skill_selections?: ComposerSkillSelection[];
}
export interface ComposerAttachment {
  file_name: string;
  kind: ComposerAttachmentKind;
  path: string;
  upload_state: ComposerAttachmentUploadState;
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
export interface ComposerCapability {
  id: string;
  kind: ComposerCapabilityKind;
  label: string;
  [k: string]: unknown;
}
/**
 * Capability eligibility context.
 *
 * The target kind exists only because native skills retain their current
 * source policy while CLI skills must be exportable. Capability support is
 * represented exclusively by [`ComposerCapabilityPolicy`].
 */
export interface ComposerCapabilityTarget {
  kind: ComposerCapabilityTargetKind;
  supports_mcp_tools: boolean;
  supports_skills: boolean;
}
export interface ComposerReplyTarget {
  author_display_name?: string | null;
  preview?: string | null;
  turn_id: string;
}
export interface ComposerMentionSelection {
  display_name: string;
  nickname: string;
  principal_id: PrincipalId;
  text_token: string;
}
export interface ComposerMessageEditTarget {
  artifacts: ArtifactRef[];
  conflicted: boolean;
  failed: boolean;
  presentation: UserMessagePresentation;
  preview: string;
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
export interface ComposerModelDisplayPublication {
  identity: ComposerOperationIdentity;
  key: ProviderModelDisplayKey;
  label?: string | null;
  reasoning_effort?: string | null;
  reasoning_effort_label?: string | null;
  request: ComposerModelDisplayRequestState;
  [k: string]: unknown;
}
export interface ComposerOperationIdentity {
  draft_id: number;
  generation: number;
  thread_id: string;
  [k: string]: unknown;
}
export interface ProviderModelDisplayKey {
  model: string;
  provider: string;
  workspace_id: string;
}
export interface ComposerOperationPublication {
  identity: ComposerOperationIdentity;
  kind: ComposerOperationKind;
  plan?: ComposerOperationPlan | null;
  status: ComposerOperationStatus;
  voice_capture_preflight?: ComposerVoiceCapturePreflightState | null;
  voice_committing: boolean;
  voice_context?: VoiceTurnContext | null;
  voice_finalize?: VoiceFinalizeResponseReduction | null;
  voice_result?: VoiceSessionResultReduction | null;
  voice_session_id?: string | null;
  voice_turn_id?: string | null;
  [k: string]: unknown;
}
export interface ComposerOperationPlan {
  authorization_fingerprint?: string | null;
  draft: ComposerDomainDraft;
  identity: ComposerOperationIdentity;
  kind: ComposerOperationKind;
  message_edit?: ComposerMessageEditTarget | null;
  steer_target?: ComposerSteerTarget | null;
  voice_start?: VoiceSessionStartContext | null;
  [k: string]: unknown;
}
export interface ComposerSteerTarget {
  runtime_id: string;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
/**
 * Minimal context required to route and own a streaming voice session.
 *
 * Full turn materialization context is provided on commit/finalize so clients can
 * start microphone streaming before slower attachment/capability preparation.
 */
export interface VoiceSessionStartContext {
  thread_id: string;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
/**
 * Frozen non-audio composer context for voice turn materialization.
 *
 * `prepared_input` is for existing prepared `UserInput` references such as
 * artifacts/local attachment references. It must not contain the future voice
 * transcript; the gateway prepends the transcript as `UserInput::Text` after
 * successful transcription.
 */
export interface VoiceTurnContext {
  /**
   * Selected skills, MCP tools/servers and related turn capabilities.
   */
  capabilities?: TurnCapability[];
  cli_runtime_options?: TurnCLIRuntimeOptions | null;
  execution_backend?: AgentExecutionBackend | null;
  mode?: ThreadMode | null;
  model?: string | null;
  model_provider?: string | null;
  /**
   * Agent permission profile for the eventual turn.
   *
   * This is not the platform microphone permission. Microphone permission
   * stays client/platform-local and is reported through voice status/errors.
   */
  permission_profile?: TurnPermissionProfileSelection | null;
  /**
   * Existing prepared composer inputs such as artifact/file references.
   *
   * This vector must not contain audio bytes or the future transcript. On
   * cancel, dropping this context must not create a turn; already completed
   * upload/cache side effects are handled by the existing attachment flow.
   */
  prepared_input?: UserInput[];
  reasoning?: TurnReasoningSelection | null;
  sandbox_policy?: SandboxPolicy | null;
  /**
   * Thread that receives the gateway-created turn after transcription.
   */
  thread_id: string;
  /**
   * Client-planned turn id reserved before any audio chunk is accepted.
   */
  turn_id: string;
  /**
   * Workspace active when the voice session starts.
   *
   * `TurnStartParams` is still thread-scoped; the gateway keeps the
   * workspace here to validate/session-route the frozen voice context.
   */
  workspace_id: string;
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
export interface TurnPermissionProfileSelection {
  mode: TurnPermissionMode;
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
export interface VoiceFinalizeResponseReduction {
  action: VoiceFinalizeUiAction;
  session_id: string;
  status: VoiceStatus;
}
export interface VoiceSessionResultReduction {
  action: VoiceFinalizeUiAction;
  error?: VoiceError | null;
  outcome: VoiceSessionOutcome;
  session_id: string;
  turn_id?: string | null;
}
export interface VoiceError {
  kind: VoiceErrorKind;
  message: string;
  public_error?: PublicError | null;
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
export interface ComposerPermissionModeOption {
  description: string;
  label: string;
  mode: TurnPermissionMode;
  [k: string]: unknown;
}
export interface ExecutionDraftReconciliation {
  changed: boolean;
  draft: ExecutionDraftSelection;
  reasons?: ExecutionDraftReconciliationReason[];
}
export interface ExecutionDraftSelection {
  has_attachments?: boolean;
  mcp_server_ids?: string[];
  model?: string | null;
  permission_mode?: TurnPermissionMode | null;
  policy_fingerprint?: string | null;
  provider?: string | null;
  skill_ids?: string[];
}
export interface ExecutionDraftReconciliationReason {
  kind: ExecutionDraftReconciliationKind;
  reason: string;
  resource_id?: string | null;
}
export interface ComposerRuntimePublication {
  active_runtime_supports_steer?: boolean | null;
  identity: ComposerOperationIdentity;
  request: ComposerCatalogRequest;
  selected_provider?: string | null;
  selected_provider_ready: boolean;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ComposerCatalogRequest {
  generation: number;
  state: ComposerCatalogRequestState;
  [k: string]: unknown;
}
export interface ComposerVoiceReadinessPublication {
  demand: ComposerVoiceReadinessDemand;
  error?: string | null;
  identity: ComposerOperationIdentity;
  loading: boolean;
  response?: VoiceStatusResponse | null;
  [k: string]: unknown;
}
export interface VoiceStatusResponse {
  active_session_id?: string | null;
  error?: VoiceError | null;
  status: VoiceStatus;
  [k: string]: unknown;
}

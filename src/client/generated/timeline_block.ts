/* eslint-disable */

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
export type CLIRuntimeRequestKind =
  'command_approval' | 'file_change_approval' | 'permission_approval' | 'user_input' | 'other';
export type CLIRuntimePendingRequestStatus =
  | 'pending'
  | 'response_accepted'
  | 'delivering'
  | 'delivery_failed'
  | 'answered'
  | 'resolved'
  | 'cancelled'
  | 'expired';

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

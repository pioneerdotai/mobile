/* eslint-disable */

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
export type ThreadMode = ('Message' | 'Agent') | 'Chat';
export type TimelineReplyState = 'available' | 'deleted' | 'unavailable';
export type AgentRouteAction =
  'send_message' | 'start_agent' | 'create_task' | 'schedule_task' | 'review_task_result' | 'deliver_result';
export type CrossThreadSourceVisibility = 'accessible' | 'inaccessible';
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

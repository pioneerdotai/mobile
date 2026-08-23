/* eslint-disable */

export type AgentExecutionId = string;
export type AgentWorkNodeState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'blocked';
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
export type AgentIdentityId = string;
export type AgentIdentitySourceKind = 'native_agent' | 'cli_runtime_instance' | 'ephemeral';
export type TurnWorkPresentation = 'expanded_live' | 'collapsed_after_final' | 'expanded_terminal_no_final';
export type TurnWorkState =
  'starting' | 'running' | 'waiting_for_approval' | 'stalled' | 'completed' | 'blocked' | 'failed' | 'interrupted';

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

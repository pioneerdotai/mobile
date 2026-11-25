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
      App: {
        app_id: string;
        dark_icon?: ImageReference | null;
        expected_revision: number;
        icon?: ImageReference | null;
        [k: string]: unknown;
      };
    }
  | {
      Plugin: {
        expected_revision: number;
        icon?: ImageReference | null;
        plugin_id: string;
        [k: string]: unknown;
      };
    }
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
export type ComposerOperationKind = 'send' | 'edit_message' | 'steer' | 'voice' | 'pick_files' | 'pick_media';
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
      capability: TurnPluginCapabilitySummary;
      type: 'plugin';
      [k: string]: unknown;
    }
  | {
      capability: TurnAppCapabilitySummary;
      type: 'app';
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
export type CLIAgentRuntimeKind = 'codex' | 'claude' | 'opencode';
export type ThreadMode = ('Message' | 'Agent') | 'Chat';
export type TimelineReplyState = 'available' | 'deleted' | 'unavailable';
export type AgentRouteAction =
  'send_message' | 'start_agent' | 'create_task' | 'schedule_task' | 'review_task_result' | 'deliver_result';
export type CrossThreadSourceVisibility = 'accessible' | 'inaccessible';
export type ClientPlannedEffect =
  | ClientEffect
  | AdministrationPresentationEffect
  | ProviderPresentationEffect
  | GatewaySessionStorageEffect
  | OnboardingPlatformEffect;
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
export type AdministrationPresentationEffect = {
  kind: 'copy_administration_activation';
  [k: string]: unknown;
};
export type ProviderPresentationEffect =
  | {
      kind: 'copy_provider_diagnostics';
      value: string;
      [k: string]: unknown;
    }
  | {
      kind: 'open_provider_path';
      path: string;
      [k: string]: unknown;
    };
export type GatewaySessionStorageEffect =
  | {
      DeleteGatewaySession: {
        endpoint: GatewayEndpoint;
        [k: string]: unknown;
      };
    }
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
export type OnboardingPlatformEffect =
  | 'LoadGatewayEnvironment'
  | {
      RemoveGatewayBindingJournal: {
        gateway_id: string;
        [k: string]: unknown;
      };
    }
  | {
      PersistGatewayRegistry: {
        registry: GatewayRegistry;
        [k: string]: unknown;
      };
    }
  | {
      PrepareLocalGateway: {
        endpoint: GatewayEndpoint;
        recover: boolean;
        [k: string]: unknown;
      };
    }
  | {
      CreateLocalDeviceActivation: {
        endpoint_id: string;
        [k: string]: unknown;
      };
    };
export type ClientTransitionOutcome = 'changed' | 'noop' | 'stale' | 'rejected';

export interface ClientTransitionDto {
  /**
   * Command receipt from Begin's own immutable publication, independent of delivery.
   */
  composer_begin_plan?: ComposerOperationPlan | null;
  effects: ClientEffectPlan[];
  outcome: ClientTransitionOutcome;
  schema_version: number;
  sequence: number;
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
  selected_context_authority?: string | null;
  selected_context_window?: number | null;
  selected_mentions?: ComposerMentionSelection[];
  selected_mode?: ('Message' | 'Agent') | 'Chat';
  selected_model?: string | null;
  selected_permission_mode?: 'full_access' | 'auto_accept_edits' | 'supervised';
  selected_provider?: string | null;
  selected_reasoning_effort?: string | null;
  selected_service_mode?: NativeServiceModeSelection | null;
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
 * Immutable image reference. Published paths are authenticated Gateway storage links.
 */
export interface ImageReference {
  path: string;
  revision: string;
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
/**
 * Explicit choice uses the existing endpoint/credential/model authority proof.
 * Absence means Standard; Inherit belongs to the enclosing model selection.
 */
export interface NativeServiceModeSelection {
  authority: string;
  id: string;
}
export interface ComposerOperationIdentity {
  draft_id: number;
  generation: number;
  thread_id: string;
  [k: string]: unknown;
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
export interface TurnPluginCapabilitySummary {
  expectedRevision: number;
  icon?: ImageReference | null;
  label: string;
  pluginId: string;
  [k: string]: unknown;
}
export interface TurnAppCapabilitySummary {
  appId: string;
  darkIcon?: ImageReference | null;
  expectedRevision: number;
  icon?: ImageReference | null;
  label: string;
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
  /**
   * CLI provider identity projected from persisted execution bindings, independent of artwork.
   */
  cli_runtime_kind?: CLIAgentRuntimeKind | null;
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
export interface GatewayRegistry {
  active_gateway_id?: string | null;
  installation_id?: string | null;
  local?: GatewayEndpoint | null;
  remotes?: GatewayEndpoint[];
  version: number;
}

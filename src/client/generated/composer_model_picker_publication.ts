/* eslint-disable */

export type AcpAuthMethodKind = 'agent' | 'terminal';
/**
 * The input specification for a command.
 */
export type AvailableCommandInput = UnstructuredCommandInput;
export type AcpConfigOptionSchema = {
  _meta?: {
    [k: string]: unknown;
  } | null;
  category?: SessionConfigOptionCategory | null;
  description?: string | null;
  id: string;
  name: string;
  [k: string]: unknown;
} & AcpConfigOptionSchema1;
/**
 * Semantic category for a session configuration option.
 *
 * This is intended to help Clients distinguish broadly common selectors (e.g. model selector vs
 * session mode selector vs thought/reasoning level) for UX purposes (keyboard shortcuts, icons,
 * placement). It MUST NOT be required for correctness. Clients MUST handle missing or unknown
 * categories gracefully.
 *
 * Category names beginning with `_` are free for custom use, like other ACP extension methods.
 * Category names that do not begin with `_` are reserved for the ACP spec.
 */
export type SessionConfigOptionCategory = 'mode' | 'model' | 'model_config' | 'thought_level' | string;
export type AcpConfigOptionSchema1 =
  | {
      currentValue: string;
      options: SessionConfigSelectOptions;
      type: 'select';
      [k: string]: unknown;
    }
  | {
      currentValue: boolean;
      type: 'boolean';
      [k: string]: unknown;
    };
/**
 * Possible values for a session configuration option.
 */
export type SessionConfigSelectOptions = SessionConfigSelectOption[] | SessionConfigSelectGroup[];
/**
 * The value to set for a session configuration option.
 *
 * The `type` field acts as the discriminator in the serialized JSON form.
 * When no `type` is present, the value is treated as a [`SessionConfigValueId`]
 * via the [`ValueId`](Self::ValueId) fallback variant.
 *
 * The `type` discriminator describes the *shape* of the value, not the option
 * kind. For example every option kind that picks from a list of ids
 * (`select`, `radio`, …) would use [`ValueId`](Self::ValueId), while a
 * future freeform text option would get its own variant.
 */
export type SessionConfigOptionValue =
  | {
      type: 'boolean';
      /**
       * The boolean value.
       */
      value: boolean;
      [k: string]: unknown;
    }
  | {
      /**
       * The value ID.
       */
      value: string;
      [k: string]: unknown;
    };
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
export type ComposerCapabilityTargetKind = 'native' | 'cli';
export type CliRuntimeMcpReadinessReason =
  | 'runtimeNotReady'
  | 'unsupportedContract'
  | 'strictIsolationFailed'
  | 'helperSelfProbeFailed'
  | 'platformIpcUnavailable'
  | 'continuityUnavailable'
  | 'readinessUnavailable';
export type RuntimeDiagnosticLevel = 'info' | 'warning' | 'error';
export type CLIAgentRuntimeKind = ('codex' | 'claude') | 'acp';
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
export type ProviderModelSelectorMode = 'Chat' | 'SelfImprovement' | 'Embeddings' | 'Transcription';
export type ReasoningCapabilitySource =
  'provider_metadata' | 'cli_metadata' | 'static_registry' | 'config_override' | 'unknown';

export interface ComposerModelPickerPublication {
  acp_session?: AcpSessionSnapshot | null;
  closed: boolean;
  deferred: boolean;
  identity: ComposerOperationIdentity;
  models_request: ComposerCatalogRequest;
  provider_rows: ComposerModelPickerProvider[];
  providers_request: ComposerCatalogRequest;
  reasoning_rows: ReasoningEffortRow[];
  revision: number;
  selected_provider_ready: boolean;
  selected_reasoning_effort?: string | null;
  selector: ProviderModelSelectorState;
  [k: string]: unknown;
}
export interface AcpSessionSnapshot {
  additional_directories: string[];
  auth_methods: AcpAuthMethod[];
  capabilities: AgentCapabilities;
  commands: AvailableCommand[];
  completed_elicitations: string[];
  config_options: AcpConfigOptionSchema[];
  configuration_replay?: AcpConfigurationChoice[];
  connected: boolean;
  continuation_requested?: boolean;
  generation: number;
  has_config_options: boolean;
  initial_descriptor_fingerprint?: string;
  modes?: SessionModeState | null;
  notice?: Notice | null;
  presentation_revision: number;
  runtime_id: string;
  session_id?: string | null;
  session_info?: SessionInfoUpdate | null;
  thread_id: string;
  usage?: UsageUpdate | null;
  version?: AcpConfigurationVersion | null;
  workspace_id: string;
  [k: string]: unknown;
}
export interface AcpAuthMethod {
  description?: string | null;
  id: string;
  kind: AcpAuthMethodKind;
  name: string;
  [k: string]: unknown;
}
/**
 * Capabilities supported by the agent.
 *
 * Advertised during initialization to inform the client about
 * available features and content types.
 *
 * See protocol docs: [Agent Capabilities](https://agentclientprotocol.com/protocol/initialization#agent-capabilities)
 */
export interface AgentCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  auth?: AgentAuthCapabilities;
  /**
   * Whether the agent supports `session/load`.
   */
  loadSession?: boolean;
  mcpCapabilities?: McpCapabilities;
  promptCapabilities?: PromptCapabilities;
  sessionCapabilities?: SessionCapabilities;
  [k: string]: unknown;
}
/**
 * Authentication-related capabilities supported by the agent.
 */
export interface AgentAuthCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  /**
   * Whether the agent supports the logout method.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports the logout method.
   */
  logout?: LogoutCapabilities | null;
  [k: string]: unknown;
}
/**
 * Logout capabilities supported by the agent.
 *
 * Supplying `{}` means the agent supports the logout method.
 */
export interface LogoutCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  [k: string]: unknown;
}
/**
 * MCP capabilities supported by the agent.
 */
export interface McpCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  /**
   * Agent supports [`McpServer::Http`].
   */
  http?: boolean;
  /**
   * Agent supports [`McpServer::Sse`].
   */
  sse?: boolean;
  [k: string]: unknown;
}
/**
 * Prompt capabilities supported by the agent.
 */
export interface PromptCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  /**
   * Agent supports [`ContentBlock::Audio`].
   */
  audio?: boolean;
  /**
   * Agent supports embedded context in `session/prompt` requests.
   *
   * When enabled, the Client is allowed to include [`ContentBlock::Resource`]
   * in prompt requests for pieces of context that are referenced in the message.
   */
  embeddedContext?: boolean;
  /**
   * Agent supports [`ContentBlock::Image`].
   */
  image?: boolean;
  [k: string]: unknown;
}
/**
 * Session lifecycle and prompt capabilities advertised by the agent.
 */
export interface SessionCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  /**
   * Whether the agent supports `additionalDirectories` on supported session lifecycle requests.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports `additionalDirectories` on
   * supported session lifecycle requests.
   *
   * Agents that also support `session/list` may return
   * `SessionInfo.additionalDirectories` to report the complete ordered
   * additional-root list associated with a listed session.
   */
  additionalDirectories?: SessionAdditionalDirectoriesCapabilities | null;
  /**
   * Whether the agent supports `session/close`.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports closing sessions.
   */
  close?: SessionCloseCapabilities | null;
  /**
   * Whether the agent supports `session/delete`.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports deleting sessions from `session/list`.
   */
  delete?: SessionDeleteCapabilities | null;
  /**
   * Whether the agent supports `session/list`.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports listing sessions.
   */
  list?: SessionListCapabilities | null;
  /**
   * Whether the agent supports `session/resume`.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports resuming sessions.
   */
  resume?: SessionResumeCapabilities | null;
  [k: string]: unknown;
}
/**
 * Capabilities for additional session directories support.
 *
 * Supplying `{}` means the agent supports the `additionalDirectories` field on
 * supported session lifecycle requests. Agents that also support
 * `session/list` may return `SessionInfo.additionalDirectories` to report the
 * complete ordered additional-root list associated with a listed session.
 */
export interface SessionAdditionalDirectoriesCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  [k: string]: unknown;
}
/**
 * Capabilities for the `session/close` method.
 *
 * Supplying `{}` means the agent supports closing sessions.
 */
export interface SessionCloseCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  [k: string]: unknown;
}
/**
 * Capabilities for the `session/delete` method.
 *
 * Supplying `{}` means the agent supports deleting sessions from `session/list`.
 */
export interface SessionDeleteCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  [k: string]: unknown;
}
/**
 * Capabilities for the `session/list` method.
 *
 * Supplying `{}` means the agent supports listing sessions.
 */
export interface SessionListCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  [k: string]: unknown;
}
/**
 * Capabilities for the `session/resume` method.
 *
 * Supplying `{}` means the agent supports resuming sessions.
 */
export interface SessionResumeCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  [k: string]: unknown;
}
/**
 * Information about a command.
 */
export interface AvailableCommand {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  /**
   * Human-readable description of what the command does.
   */
  description: string;
  /**
   * Input for the command if required
   */
  input?: AvailableCommandInput | null;
  /**
   * Command name (e.g., `create_plan`, `research_codebase`).
   */
  name: string;
  [k: string]: unknown;
}
/**
 * All text that was typed after the command name is provided as input.
 */
export interface UnstructuredCommandInput {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  /**
   * A hint to display when the input hasn't been provided yet
   */
  hint: string;
  [k: string]: unknown;
}
/**
 * A possible value for a session configuration option.
 */
export interface SessionConfigSelectOption {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  /**
   * Optional description for this option value.
   */
  description?: string | null;
  /**
   * Human-readable label for this option value.
   */
  name: string;
  /**
   * Unique identifier for this option value.
   */
  value: string;
  [k: string]: unknown;
}
/**
 * A group of possible values for a session configuration option.
 */
export interface SessionConfigSelectGroup {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  /**
   * Unique identifier for this group.
   */
  group: string;
  /**
   * Human-readable label for this group.
   */
  name: string;
  /**
   * The set of option values in this group.
   */
  options: SessionConfigSelectOption[];
  [k: string]: unknown;
}
/**
 * An actually applied choice, in receive order. The descriptor identity is
 * checked before replay; opaque ids never determine dependency ordering.
 */
export interface AcpConfigurationChoice {
  config_id: string;
  descriptor_fingerprint: string;
  value: SessionConfigOptionValue;
  [k: string]: unknown;
}
/**
 * The set of modes and the one currently active.
 */
export interface SessionModeState {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  /**
   * The set of modes that the Agent can operate in
   */
  availableModes: SessionMode[];
  /**
   * The current mode the Agent is in.
   */
  currentModeId: string;
  [k: string]: unknown;
}
/**
 * A mode the agent can operate in.
 *
 * See protocol docs: [Session Modes](https://agentclientprotocol.com/protocol/session-modes)
 */
export interface SessionMode {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  /**
   * Optional human-readable details shown with this protocol object.
   */
  description?: string | null;
  /**
   * Stable identifier used to refer to this protocol object in later messages.
   */
  id: string;
  /**
   * Human-readable name shown for this protocol object.
   */
  name: string;
  [k: string]: unknown;
}
/**
 * Fire-and-forget information for the user.
 *
 * Notices are live events rather than session history. Agents must not rely on
 * a notice being received, displayed, or seen by the user.
 * Agents MUST only send notices when the Client advertised
 * [`ClientSessionCapabilities::notices`]. Otherwise, Agents may use an agent
 * message when the information should still be surfaced to the user.
 *
 * See RFD: [Session Notices](https://agentclientprotocol.com/rfds/session-notices)
 */
export interface Notice {
  /**
   * Metadata scoped to this notice.
   *
   * Omitted and `null` are equivalent and mean no metadata was supplied.
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  /**
   * Optional plain-text detail or guidance.
   *
   * Omitted and `null` are equivalent and mean no description was supplied.
   */
  description?: string | null;
  /**
   * Presentation severity hint.
   */
  severity: 'info' | 'warning' | 'error' | string;
  /**
   * Required non-empty plain-text title that can stand alone.
   */
  title: string;
  [k: string]: unknown;
}
/**
 * Update to session metadata. All fields are optional to support partial updates.
 *
 * Agents send this notification to update session information like title or custom metadata.
 * This allows clients to display dynamic session names and track session state changes.
 */
export interface SessionInfoUpdate {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  /**
   * Human-readable title for the session. Set to null to clear.
   */
  title?: string | null;
  /**
   * ISO 8601 timestamp of last activity. Set to null to clear.
   */
  updatedAt?: string | null;
  [k: string]: unknown;
}
/**
 * Context window and cost update for a session.
 */
export interface UsageUpdate {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  /**
   * Cumulative session cost (optional).
   */
  cost?: Cost | null;
  /**
   * Total context window size in tokens.
   */
  size: number;
  /**
   * Tokens currently in context.
   */
  used: number;
  [k: string]: unknown;
}
/**
 * Cost information for a session.
 */
export interface Cost {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  /**
   * Total cumulative cost for session.
   */
  amount: number;
  /**
   * ISO 4217 currency code (e.g., "USD", "EUR").
   */
  currency: string;
  [k: string]: unknown;
}
export interface AcpConfigurationVersion {
  connection_id: string;
  revision: number;
  [k: string]: unknown;
}
export interface ComposerOperationIdentity {
  draft_id: number;
  generation: number;
  thread_id: string;
  [k: string]: unknown;
}
export interface ComposerCatalogRequest {
  generation: number;
  state: ComposerCatalogRequestState;
  [k: string]: unknown;
}
export interface ComposerModelPickerProvider {
  capability_target: ComposerCapabilityTarget;
  cli_runtime: boolean;
  id: string;
  label: string;
  mcp_readiness_reason?: CliRuntimeMcpReadinessReason | null;
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
export interface ReasoningEffortRow {
  effort: string;
  label: string;
  selected: boolean;
}
export interface ProviderModelSelectorState {
  cli_runtimes: RuntimeSummary[];
  error?: string | null;
  loading_cli_runtimes: boolean;
  loading_models: boolean;
  loading_providers: boolean;
  mode: ProviderModelSelectorMode;
  models: ProviderModelInfo[];
  providers: ProviderSummary[];
  selected_model?: string | null;
  selected_provider?: string | null;
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
  proxy_url?: string | null;
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
  supports_mcp_tools?: boolean;
  supports_model_list: boolean;
  supports_resume: boolean;
  supports_review: boolean;
  supports_skills?: boolean;
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
export interface ProviderModelInfo {
  active?: boolean | null;
  capabilities: ProviderModelCapabilities;
  created?: number | null;
  description?: string | null;
  family?: string | null;
  id: string;
  lifecycle_status?: string | null;
  limits: ProviderModelLimits;
  name?: string | null;
  owned_by?: string | null;
  pricing?: ProviderModelPricing | null;
  provider: string;
  transcription?: ProviderTranscriptionModelMetadata | null;
  [k: string]: unknown;
}
export interface ProviderModelCapabilities {
  embeddings?: boolean | null;
  fine_tuning?: boolean | null;
  input_modalities?: string[] | null;
  json_output?: boolean | null;
  output_modalities?: string[] | null;
  reasoning?: ProviderModelReasoningCapabilities | null;
  streaming?: boolean | null;
  thinking?: boolean | null;
  tool_calling?: boolean | null;
  transcription?: boolean | null;
  vision?: boolean | null;
  [k: string]: unknown;
}
export interface ProviderModelReasoningCapabilities {
  default_effort?: string | null;
  effort_options?: string[];
  mandatory?: boolean | null;
  source?: ReasoningCapabilitySource | null;
  supported?: boolean | null;
  supports_token_budget?: boolean | null;
  [k: string]: unknown;
}
export interface ProviderModelLimits {
  context_window?: number | null;
  max_input_tokens?: number | null;
  max_output_tokens?: number | null;
  [k: string]: unknown;
}
export interface ProviderModelPricing {
  image?: number | null;
  input_token?: number | null;
  output_token?: number | null;
  request?: number | null;
  [k: string]: unknown;
}
export interface ProviderTranscriptionModelMetadata {
  accuracy_score: number;
  download_size_mb: number;
  engine: string;
  recommended: boolean;
  speed_score: number;
  supported_languages: string[];
  supports_language_selection: boolean;
  supports_translation: boolean;
  [k: string]: unknown;
}
export interface ProviderSummary {
  api_key_configured?: boolean;
  /**
   * The gateway can construct this provider in the selected workspace.
   */
  available?: boolean | null;
  base_url?: string | null;
  capabilities?: ProviderSummaryCapabilities;
  name: string;
  proxy_url?: string | null;
  [k: string]: unknown;
}
export interface ProviderSummaryCapabilities {
  embeddings?: boolean;
  /**
   * Gateway-authoritative eligibility for the API-only self-improvement
   * model selectors.
   */
  self_improvement?: boolean;
  transcription?: boolean;
  [k: string]: unknown;
}

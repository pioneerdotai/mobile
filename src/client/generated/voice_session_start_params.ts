/* eslint-disable */

export type VoiceAudioEncoding = 'pcm_s16_le' | 'pcm_f32_le';
export type TurnCapabilityKind =
  | {
      slug: string;
      sourceKind: string;
      type: 'skill';
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
export type McpScopeKind = 'workspace' | 'user';
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
export type ThreadMode = 'Chat' | 'Agent';
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

export interface VoiceSessionStartParams {
  audio_format: VoiceAudioFormat;
  context: VoiceTurnContext;
  [k: string]: unknown;
}
/**
 * Audio format metadata for a voice session.
 *
 * This is control metadata only. It does not carry audio bytes.
 */
export interface VoiceAudioFormat {
  channels: number;
  encoding: VoiceAudioEncoding;
  sample_rate_hz: number;
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
  effort: string;
  [k: string]: unknown;
}
export interface SandboxPolicy {
  mode: SandboxMode;
  [k: string]: unknown;
}

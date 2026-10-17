/* eslint-disable */

export type ProviderCommand =
  | {
      kind: 'acp_session';
      params: AcpSessionParams;
      [k: string]: unknown;
    }
  | {
      kind: 'release_acp_auth';
      params: AcpSessionParams;
      [k: string]: unknown;
    }
  | {
      kind: 'configure';
      params: ProviderConfigureParams;
      [k: string]: unknown;
    }
  | {
      kind: 'disconnect';
      params: ProviderDeleteApiKeyParams;
      [k: string]: unknown;
    }
  | {
      kind: 'connect';
      params: CLIRuntimeLoginStartParams;
      [k: string]: unknown;
    }
  | {
      kind: 'set_runtime_proxy';
      params: CLIRuntimeProxySetParams;
      [k: string]: unknown;
    }
  | {
      kind: 'remove_runtime_proxy';
      params: CLIRuntimeProxyDeleteParams;
      [k: string]: unknown;
    }
  | {
      kind: 'save_runtime';
      params: {
        draft: CLIRuntimeProviderDraft;
        workspace_id: string;
        [k: string]: unknown;
      };
      [k: string]: unknown;
    }
  | {
      kind: 'set_runtime_enabled';
      params: {
        enabled: boolean;
        runtime_id: string;
        workspace_id: string;
        [k: string]: unknown;
      };
      [k: string]: unknown;
    };
export type AcpSessionOperation =
  | {
      additional_directories?: string[];
      type: 'prepare';
      [k: string]: unknown;
    }
  | {
      config_id: string;
      expected: AcpConfigurationVersion;
      session_id: string;
      type: 'set_option';
      value: SessionConfigOptionValue;
      [k: string]: unknown;
    }
  | {
      expected: AcpConfigurationVersion;
      mode_id: string;
      session_id: string;
      type: 'set_mode';
      [k: string]: unknown;
    }
  | {
      method_id: string;
      type: 'authenticate';
      [k: string]: unknown;
    }
  | {
      columns: number;
      expected_generation: number;
      method_id: string;
      rows: number;
      terminal_id: string;
      type: 'terminal_auth_start';
      [k: string]: unknown;
    }
  | {
      data: string;
      terminal_id: string;
      type: 'terminal_auth_input';
      [k: string]: unknown;
    }
  | {
      terminal_id: string;
      type: 'terminal_auth_output';
      [k: string]: unknown;
    }
  | {
      expected_generation: number;
      terminal_id: string;
      type: 'terminal_auth_close';
      [k: string]: unknown;
    }
  | {
      type: 'logout';
      [k: string]: unknown;
    }
  | {
      cursor?: string | null;
      cwd?: string | null;
      type: 'list';
      [k: string]: unknown;
    }
  | {
      session_id: string;
      type: 'load';
      [k: string]: unknown;
    }
  | {
      session_id: string;
      type: 'resume';
      [k: string]: unknown;
    }
  | {
      session_id: string;
      type: 'delete';
      [k: string]: unknown;
    }
  | {
      session_id: string;
      type: 'close';
      [k: string]: unknown;
    }
  | {
      type: 'snapshot';
      [k: string]: unknown;
    };
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
export type ModelSelectionTransport = 'api' | 'codex' | 'claude';
export type CLIAgentRuntimeKind = ('codex' | 'claude') | 'acp';
export type CLIRuntimeProviderDraftMode =
  | 'Create'
  | {
      Edit: {
        original_id: string;
        [k: string]: unknown;
      };
    }
  | {
      Duplicate: {
        source_id: string;
        [k: string]: unknown;
      };
    };

export interface AcpSessionParams {
  operation: AcpSessionOperation;
  runtime_id: string;
  thread_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface AcpConfigurationVersion {
  connection_id: string;
  revision: number;
  [k: string]: unknown;
}
export interface ProviderConfigureParams {
  api_key?: string | null;
  base_url?: string | null;
  clear_base_url?: boolean;
  clear_proxy?: boolean;
  provider: string;
  proxy_url?: string | null;
  workspace_id: string;
  [k: string]: unknown;
}
export interface ProviderDeleteApiKeyParams {
  provider: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface CLIRuntimeLoginStartParams {
  login_type?: 'chatgptDeviceCode' | 'chatgpt';
  runtime_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface CLIRuntimeProxySetParams {
  proxy_url: string;
  runtime_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface CLIRuntimeProxyDeleteParams {
  runtime_id: string;
  workspace_id: string;
  [k: string]: unknown;
}
export interface CLIRuntimeProviderDraft {
  args_json?: string;
  binary_path: string;
  /**
   * Whole override; Inherit explicitly clears it instead of persisting fallback.
   */
  compaction_model?:
    | {
        source: 'inherit';
      }
    | {
        instance: string;
        model: string;
        reasoning_effort?: string | null;
        source: 'explicit';
        transport: ModelSelectionTransport;
      };
  display_name: string;
  enabled: boolean;
  env_from_json?: string;
  home_path: string;
  id: string;
  kind: CLIAgentRuntimeKind;
  mode: CLIRuntimeProviderDraftMode;
  /**
   * Stable agent presentation nickname.  The UI does not expose this
   * field yet, but edits must preserve the gateway-owned value.
   */
  nickname?: string;
  shadow_home_path: string;
  [k: string]: unknown;
}

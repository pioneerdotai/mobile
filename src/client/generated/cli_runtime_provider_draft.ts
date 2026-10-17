/* eslint-disable */

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

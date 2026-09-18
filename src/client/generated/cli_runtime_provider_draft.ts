/* eslint-disable */

export type ModelSelectionTransport = 'api' | 'codex' | 'claude';
export type CLIAgentRuntimeKind = 'codex' | 'claude';
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

/* eslint-disable */

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

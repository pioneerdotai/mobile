/* eslint-disable */

export type CLIRuntimeProviderSettingsRejection =
  | ('MissingSettings' | 'EmptyId' | 'ShadowHomeMatchesHome')
  | {
      MissingRuntime: {
        runtime_id: string;
        [k: string]: unknown;
      };
    }
  | {
      InvalidId: {
        id: string;
        message: string;
        [k: string]: unknown;
      };
    }
  | {
      DuplicateId: {
        id: string;
        [k: string]: unknown;
      };
    }
  | {
      DuplicateDisplayName: {
        display_name: string;
        [k: string]: unknown;
      };
    }
  | {
      EmptyPath: {
        field: string;
        [k: string]: unknown;
      };
    }
  | {
      InvalidPath: {
        field: string;
        message: string;
        [k: string]: unknown;
      };
    }
  | {
      UnsupportedKind: {
        kind: CLIAgentRuntimeKind;
        [k: string]: unknown;
      };
    };
export type CLIAgentRuntimeKind = 'codex' | 'claude';

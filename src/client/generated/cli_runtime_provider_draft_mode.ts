/* eslint-disable */

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

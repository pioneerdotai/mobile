/* eslint-disable */

export type VoiceInputSettingsAction =
  | {
      kind: 'enable';
      [k: string]: unknown;
    }
  | {
      kind: 'disable';
      [k: string]: unknown;
    }
  | {
      kind: 'select';
      model?: string | null;
      provider?: string | null;
      [k: string]: unknown;
    }
  | {
      kind: 'retry';
      [k: string]: unknown;
    };

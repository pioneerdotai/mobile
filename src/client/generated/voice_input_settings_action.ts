/* eslint-disable */

export type VoiceInputSettingsAction =
  | {
      enabled: boolean;
      kind: 'set_transcribe_while_recording';
      [k: string]: unknown;
    }
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

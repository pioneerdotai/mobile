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
export type GatewayVoiceInputProvider = 'local';

export interface VoiceInputSettingsPlanRequest {
  action: VoiceInputSettingsAction;
  current: GatewayVoiceInputSettings;
  [k: string]: unknown;
}
export interface GatewayVoiceInputSettings {
  transcribe_while_recording?: boolean;
  enabled?: boolean;
  model?: string | null;
  provider?: GatewayVoiceInputProvider | null;
  runtime?: GatewayVoiceInputRuntimeSnapshot;
  [k: string]: unknown;
}
export interface GatewayVoiceInputRuntimeSnapshot {
  downloaded_bytes?: number | null;
  effective_enabled?: boolean;
  error?: string | null;
  model?: string | null;
  phase?: 'disabled' | 'model_not_selected' | 'missing' | 'downloading' | 'installing' | 'loading' | 'ready' | 'failed';
  total_bytes?: number | null;
  [k: string]: unknown;
}

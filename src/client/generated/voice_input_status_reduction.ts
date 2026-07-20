/* eslint-disable */

export type GatewayVoiceInputRuntimePhase =
  'disabled' | 'model_not_selected' | 'missing' | 'downloading' | 'installing' | 'loading' | 'ready' | 'failed';
export type VoiceInputRuntimePresentation = 'disabled' | 'needs_selection' | 'preparing' | 'ready' | 'failed';

export interface VoiceInputStatusReduction {
  desired_enabled: boolean;
  effective_enabled: boolean;
  model_selected: boolean;
  non_terminal: boolean;
  phase: GatewayVoiceInputRuntimePhase;
  presentation: VoiceInputRuntimePresentation;
  retry_available: boolean;
  show_progress: boolean;
  [k: string]: unknown;
}

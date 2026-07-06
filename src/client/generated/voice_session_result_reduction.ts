/* eslint-disable */

export type VoiceFinalizeUiAction =
  | 'keep_finalizing'
  | 'clear_finalizing'
  | 'show_no_speech_error'
  | 'show_finalize_error';
export type VoiceErrorKind =
  | 'model_unavailable'
  | 'microphone_permission_blocked'
  | 'device_unavailable'
  | 'invalid_session'
  | 'stale_chunk'
  | 'sequence_gap'
  | 'cancelled'
  | 'no_speech'
  | 'transcription_failed'
  | 'gateway_busy'
  | 'model_downloading'
  | 'unknown';
export type VoiceSessionOutcome = 'turn_started' | 'cancelled' | 'no_speech' | 'failed';

export interface VoiceSessionResultReduction {
  action: VoiceFinalizeUiAction;
  error?: VoiceError | null;
  outcome: VoiceSessionOutcome;
  session_id: string;
  turn_id?: string | null;
}
export interface VoiceError {
  kind: VoiceErrorKind;
  message: string;
  [k: string]: unknown;
}

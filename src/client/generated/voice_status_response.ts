/* eslint-disable */

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
export type VoiceStatus =
  | ('disabled' | 'unavailable' | 'model_loading' | 'ready' | 'busy' | 'recording' | 'transcribing' | 'error')
  | 'model_downloading';

export interface VoiceStatusResponse {
  active_session_id?: string | null;
  error?: VoiceError | null;
  status: VoiceStatus;
  [k: string]: unknown;
}
export interface VoiceError {
  kind: VoiceErrorKind;
  message: string;
  [k: string]: unknown;
}

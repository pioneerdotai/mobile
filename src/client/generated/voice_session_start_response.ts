/* eslint-disable */

export type VoiceStatus =
  | ('disabled' | 'unavailable' | 'model_loading' | 'ready' | 'busy' | 'recording' | 'transcribing' | 'error')
  | 'model_downloading';

export interface VoiceSessionStartResponse {
  /** Version 1 verifies the ordered PCM ingress at finalize, before publication. */
  audio_integrity_version?: number | null;
  session_id: string;
  status: VoiceStatus;
  [k: string]: unknown;
}

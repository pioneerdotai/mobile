/* eslint-disable */

export type VoiceStatus =
  | ('unavailable' | 'model_loading' | 'ready' | 'busy' | 'recording' | 'transcribing' | 'error')
  | 'model_downloading';

export interface VoiceSessionStartResponse {
  session_id: string;
  status: VoiceStatus;
  [k: string]: unknown;
}

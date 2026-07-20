/* eslint-disable */

export type VoiceStatus =
  | ('disabled' | 'unavailable' | 'model_loading' | 'ready' | 'busy' | 'recording' | 'transcribing' | 'error')
  | 'model_downloading';

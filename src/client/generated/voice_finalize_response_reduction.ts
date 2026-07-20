/* eslint-disable */

export type VoiceFinalizeUiAction =
  'keep_finalizing' | 'clear_finalizing' | 'show_no_speech_error' | 'show_finalize_error';
export type VoiceStatus =
  | ('disabled' | 'unavailable' | 'model_loading' | 'ready' | 'busy' | 'recording' | 'transcribing' | 'error')
  | 'model_downloading';

export interface VoiceFinalizeResponseReduction {
  action: VoiceFinalizeUiAction;
  session_id: string;
  status: VoiceStatus;
}

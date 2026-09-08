/* eslint-disable */

export type VoiceAudioEncoding = 'pcm_s16_le' | 'pcm_f32_le';

export interface ComposerVoiceStartRequest {
  audio_format: VoiceAudioFormat;
  operation: ComposerOperationIdentity;
}
/**
 * Audio format metadata for a voice session.
 *
 * This is control metadata only. It does not carry audio bytes.
 */
export interface VoiceAudioFormat {
  channels: number;
  encoding: VoiceAudioEncoding;
  sample_rate_hz: number;
  [k: string]: unknown;
}
export interface ComposerOperationIdentity {
  draft_id: number;
  generation: number;
  thread_id: string;
  [k: string]: unknown;
}

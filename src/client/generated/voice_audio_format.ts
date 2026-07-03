/* eslint-disable */

export type VoiceAudioEncoding = 'pcm_s16_le' | 'pcm_f32_le';

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

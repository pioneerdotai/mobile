/* eslint-disable */

export type VoiceAudioEncoding = 'pcm_s16_le' | 'pcm_f32_le';

export interface VoiceSessionStartParams {
  audio_format: VoiceAudioFormat;
  context: VoiceSessionStartContext;
  [k: string]: unknown;
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
/**
 * Minimal context required to route and own a streaming voice session.
 *
 * Full turn materialization context is provided on commit/finalize so clients can
 * start microphone streaming before slower attachment/capability preparation.
 */
export interface VoiceSessionStartContext {
  thread_id: string;
  turn_id: string;
  workspace_id: string;
  [k: string]: unknown;
}

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
export type PublicErrorCode =
  | 'invalid_input'
  | 'policy_denied'
  | 'not_found'
  | 'conflict'
  | 'resource_exhausted'
  | 'unavailable'
  | 'timeout'
  | 'internal';
export type PublicErrorStage =
  'discovery' | 'admission' | 'preparation' | 'execution' | 'persistence' | 'delivery' | 'observation';
export type VoiceSessionOutcome = 'turn_started' | 'cancelled' | 'no_speech' | 'failed';

/**
 * Voice session terminal notification.
 *
 * This never carries transcript text. Successful user-message rendering comes
 * from the normal `turn/started` and timeline notifications.
 */
export interface VoiceSessionResultNotification {
  error?: VoiceError | null;
  outcome: VoiceSessionOutcome;
  session_id: string;
  turn_id?: string | null;
  [k: string]: unknown;
}
export interface VoiceError {
  kind: VoiceErrorKind;
  message: string;
  public_error?: PublicError | null;
  [k: string]: unknown;
}
/**
 * Stable, bounded failure presentation shared by RPC, voice and task
 * execution surfaces. Raw source chains are never part of this type.
 */
export interface PublicError {
  code: PublicErrorCode;
  correlation_id: string;
  message: string;
  retry_after_ms?: number | null;
  retryable: boolean;
  stage: PublicErrorStage;
  version: number;
  [k: string]: unknown;
}

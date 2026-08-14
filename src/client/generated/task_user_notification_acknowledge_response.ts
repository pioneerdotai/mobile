/* eslint-disable */

export type TaskErrorClass =
  'cancelled' | 'timeout' | 'provider' | 'tool' | 'validation' | 'dependency' | 'policy' | 'internal' | 'unknown';
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

export interface TaskUserNotificationAcknowledgeResponse {
  notification: TaskUserNotification;
  [k: string]: unknown;
}
/**
 * Durable exact-recipient Task notification returned by the user inbox.
 *
 * The websocket notification is only a live invalidation hint. This record is
 * the reconnect-safe source of truth and deliberately contains only the
 * collaborator-safe Task projection.
 */
export interface TaskUserNotification {
  acknowledgedAt?: number | null;
  createdAt: number;
  deliveryId: string;
  error?: PublicTaskFailure | null;
  notificationId: string;
  result?: PublicTaskResult | null;
  runId: string;
  taskId: string;
  workspaceId: string;
  [k: string]: unknown;
}
export interface PublicTaskFailure {
  class: TaskErrorClass;
  error: PublicError;
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
export interface PublicTaskResult {
  artifacts?: PublicTaskArtifact[];
  summary?: string | null;
  [k: string]: unknown;
}
export interface PublicTaskArtifact {
  artifactId?: string | null;
  mimeType?: string | null;
  versionId?: string | null;
  [k: string]: unknown;
}

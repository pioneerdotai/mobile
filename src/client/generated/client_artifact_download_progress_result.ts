/* eslint-disable */

export type ClientArtifactDownloadState = 'queued' | 'downloading' | 'completed' | 'failed' | 'cancelled';

export interface ClientArtifactDownloadProgressResult {
  downloaded_bytes: number;
  error_code?: string | null;
  operation_id: string;
  resumed_from_bytes: number;
  state: ClientArtifactDownloadState;
  total_bytes: number;
  [k: string]: unknown;
}

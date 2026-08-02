import type { ClientArtifactDownloadProgressResult } from '@/client';

export type MobileArtifactTarget = Readonly<{
    workspaceId: string;
    artifactId: string;
    versionId?: string | null;
}>;

export const mobileArtifactActionKey = (
    workspaceId: string,
    artifactId: string,
    versionId?: string | null,
): string => JSON.stringify([workspaceId, artifactId, versionId ?? null]);

export type MobileArtifactActionErrorCode =
    | 'authentication_required'
    | 'reconfiguration_required'
    | 'revoked_or_unavailable'
    | 'grant_expired'
    | 'cancelled'
    | 'integrity_failed'
    | 'disk_full'
    | 'viewer_failed'
    | 'share_failed'
    | 'download_failed';

export type MobileArtifactActionState =
    | { kind: 'idle' }
    | { kind: 'opening' }
    | {
          kind: 'downloading';
          operationId: string;
          downloadedBytes: number;
          totalBytes: number;
      }
    | { kind: 'sharing' }
    | { kind: 'failed'; code: MobileArtifactActionErrorCode };

export type MobileArtifactActionEvent =
    | { type: 'open-started' }
    | { type: 'download-started'; operationId: string }
    | { type: 'download-progress'; progress: ClientArtifactDownloadProgressResult }
    | { type: 'share-started' }
    | { type: 'completed' }
    | { type: 'failed'; code: MobileArtifactActionErrorCode };

export const reduceMobileArtifactAction = (
    _state: MobileArtifactActionState,
    event: MobileArtifactActionEvent,
): MobileArtifactActionState => {
    switch (event.type) {
        case 'open-started':
            return { kind: 'opening' };
        case 'download-started':
            return {
                kind: 'downloading',
                operationId: event.operationId,
                downloadedBytes: 0,
                totalBytes: 0,
            };
        case 'download-progress':
            return {
                kind: 'downloading',
                operationId: event.progress.operation_id,
                downloadedBytes: event.progress.downloaded_bytes,
                totalBytes: event.progress.total_bytes,
            };
        case 'share-started':
            return { kind: 'sharing' };
        case 'completed':
            return { kind: 'idle' };
        case 'failed':
            return { kind: 'failed', code: event.code };
    }
};

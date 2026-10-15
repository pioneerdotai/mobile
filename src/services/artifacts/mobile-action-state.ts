export type MobileArtifactTarget = Readonly<{
    threadId?: string | null;
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

const presentationError = (code: string): MobileArtifactActionErrorCode => {
    switch (code) {
        case 'artifact_authentication_required':
            return 'authentication_required';
        case 'artifact_reconfiguration_required':
            return 'reconfiguration_required';
        case 'artifact_revoked_or_unavailable':
            return 'revoked_or_unavailable';
        case 'grant_expired':
        case 'cancelled':
        case 'integrity_failed':
        case 'disk_full':
        case 'viewer_failed':
        case 'share_failed':
            return code;
        default:
            return 'download_failed';
    }
};

export const artifactActionPresentation = (
    publication: import('@/client/generated/artifact_publication').ArtifactPublication | null,
): Record<string, MobileArtifactActionState> =>
    Object.fromEntries(
        (publication?.actions ?? []).map((action): [string, MobileArtifactActionState] => {
            const key = mobileArtifactActionKey(
                action.target.workspace_id,
                action.target.artifact_id,
                action.target.version_id,
            );
            switch (action.state.kind) {
                case 'completed':
                    return [key, { kind: 'idle' }];
                case 'cancelled':
                    return [key, { kind: 'failed', code: 'cancelled' }];
                case 'failed':
                    return [key, { kind: 'failed', code: presentationError(action.state.code) }];
            }
            if (action.action === 'open') return [key, { kind: 'opening' }];
            if (action.state.kind === 'presenting') return [key, { kind: 'sharing' }];
            const download = publication?.downloads.find(
                (d) =>
                    d.identity.operation_id === action.download?.operation_id &&
                    d.identity.generation === action.download.generation,
            );
            return [
                key,
                {
                    kind: 'downloading',
                    operationId: action.download?.operation_id ?? '',
                    downloadedBytes: download?.downloaded_bytes ?? 0,
                    totalBytes: download?.total_bytes ?? 0,
                },
            ];
        }),
    );

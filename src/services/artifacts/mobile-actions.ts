import { AppState, Linking, Share } from 'react-native';

import {
    PioneerClientNativeError,
    pioneerClient,
    type ClientArtifactDownloadProgressResult,
    type ClientArtifactDownloadRequest,
    type ClientArtifactDownloadResult,
    type ClientArtifactTargetRequest,
    type ClientArtifactViewOpenResult,
} from '@/client';

export type MobileArtifactTarget = Readonly<{
    workspaceId: string;
    artifactId: string;
    versionId?: string | null;
}>;

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

export type MobileArtifactNativePort = Readonly<{
    open(request: ClientArtifactTargetRequest): Promise<ClientArtifactViewOpenResult>;
    download(request: ClientArtifactDownloadRequest): Promise<ClientArtifactDownloadResult>;
    progress(operationId: string): Promise<ClientArtifactDownloadProgressResult>;
    cancel(operationId: string): Promise<void>;
}>;

export type MobileArtifactViewerPort = Readonly<{
    openUrl(url: string): Promise<void>;
}>;

export type MobileArtifactSharePort = Readonly<{
    shareVerifiedFile(result: ClientArtifactDownloadResult): Promise<void>;
}>;

export type MobileArtifactActionPorts = Readonly<{
    native: MobileArtifactNativePort;
    viewer: MobileArtifactViewerPort;
    share: MobileArtifactSharePort;
    isForeground(): boolean;
    delay(milliseconds: number): Promise<void>;
    nowUnixSeconds(): number;
}>;

export const mobileArtifactActionPorts: MobileArtifactActionPorts = {
    native: {
        open: (request) => pioneerClient.artifactViewOpen(request),
        download: (request) => pioneerClient.artifactDownload(request),
        progress: (operationId) =>
            pioneerClient.artifactDownloadProgress({ operation_id: operationId }),
        cancel: async (operationId) => {
            await pioneerClient.artifactDownloadCancel({ operation_id: operationId });
        },
    },
    viewer: {
        openUrl: async (url) => {
            await Linking.openURL(url);
        },
    },
    share: {
        shareVerifiedFile: async (result) => {
            await Share.share({
                title: result.display_name,
                url: localFileUrl(result.local_file_path),
            });
        },
    },
    isForeground: () => AppState.currentState === 'active',
    delay: (milliseconds) =>
        new Promise((resolve) => {
            setTimeout(resolve, milliseconds);
        }),
    nowUnixSeconds: () => Math.floor(Date.now() / 1_000),
};

export const openMobileArtifact = async (
    target: MobileArtifactTarget,
    dispatch: (event: MobileArtifactActionEvent) => void,
    ports: MobileArtifactActionPorts = mobileArtifactActionPorts,
): Promise<void> => {
    dispatch({ type: 'open-started' });
    try {
        const result = await ports.native.open(nativeTarget(target));
        if (result.expires_at <= ports.nowUnixSeconds()) {
            throw new MobileArtifactActionError('grant_expired');
        }
        const ephemeralViewUrl = result.view_url;
        await ports.viewer.openUrl(ephemeralViewUrl);
        dispatch({ type: 'completed' });
    } catch (error) {
        dispatch({ type: 'failed', code: mobileArtifactErrorCode(error, 'viewer_failed') });
    }
};

export const downloadAndShareMobileArtifact = async (
    target: MobileArtifactTarget,
    operationId: string,
    dispatch: (event: MobileArtifactActionEvent) => void,
    ports: MobileArtifactActionPorts = mobileArtifactActionPorts,
): Promise<void> => {
    dispatch({ type: 'download-started', operationId });
    let settled = false;
    const resultPromise = ports.native
        .download({
            ...nativeTarget(target),
            operation_id: operationId,
        })
        .finally(() => {
            settled = true;
        });
    try {
        while (!settled) {
            await ports.delay(150);
            if (!settled && ports.isForeground()) {
                await ports.native
                    .progress(operationId)
                    .then((progress) => dispatch({ type: 'download-progress', progress }))
                    .catch(() => undefined);
            }
        }
        const result = await resultPromise;
        assertVerifiedNativeResult(result, operationId);
        dispatch({ type: 'share-started' });
        await ports.share
            .shareVerifiedFile(result)
            .catch(() => Promise.reject(new MobileArtifactActionError('share_failed')));
        dispatch({ type: 'completed' });
    } catch (error) {
        await resultPromise.catch(() => undefined);
        dispatch({ type: 'failed', code: mobileArtifactErrorCode(error, 'download_failed') });
    }
};

export const cancelMobileArtifactDownload = async (
    operationId: string,
    dispatch: (event: MobileArtifactActionEvent) => void,
    ports: MobileArtifactActionPorts = mobileArtifactActionPorts,
): Promise<void> => {
    await ports.native.cancel(operationId);
    dispatch({ type: 'failed', code: 'cancelled' });
};

class MobileArtifactActionError extends Error {
    readonly code: MobileArtifactActionErrorCode;

    constructor(code: MobileArtifactActionErrorCode) {
        super(code);
        this.name = 'MobileArtifactActionError';
        this.code = code;
    }
}

const nativeTarget = (target: MobileArtifactTarget): ClientArtifactTargetRequest => ({
    workspace_id: target.workspaceId,
    artifact_id: target.artifactId,
    version_id: target.versionId ?? null,
});

const localFileUrl = (path: string): string => {
    if (path.startsWith('file://')) {
        return path;
    }
    return `file://${encodeURI(path)}`;
};

const assertVerifiedNativeResult = (
    result: ClientArtifactDownloadResult,
    operationId: string,
): void => {
    if (
        result.operation_id !== operationId ||
        !result.local_file_path ||
        !result.version_id ||
        !result.sha256 ||
        result.size_bytes < 0
    ) {
        throw new MobileArtifactActionError('integrity_failed');
    }
};

const mobileArtifactErrorCode = (
    error: unknown,
    fallback: MobileArtifactActionErrorCode,
): MobileArtifactActionErrorCode => {
    if (error instanceof MobileArtifactActionError) {
        return error.code;
    }
    const code = error instanceof PioneerClientNativeError ? error.code : null;
    switch (code) {
        case 'artifact_authentication_required':
            return 'authentication_required';
        case 'artifact_reconfiguration_required':
            return 'reconfiguration_required';
        case 'artifact_revoked_or_unavailable':
            return 'revoked_or_unavailable';
        case 'cancelled':
            return 'cancelled';
        case 'integrity_failed':
            return 'integrity_failed';
        case 'disk_full':
            return 'disk_full';
        default:
            return fallback;
    }
};

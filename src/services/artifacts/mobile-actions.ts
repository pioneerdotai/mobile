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
import {
    activeGatewayConnectionGeneration,
    refreshActiveGatewaySessionAfterUnauthorized,
} from '@/services/gateway/session';
import type {
    MobileArtifactActionErrorCode,
    MobileArtifactActionEvent,
    MobileArtifactTarget,
} from './mobile-action-state';

export { mobileArtifactActionKey, reduceMobileArtifactAction } from './mobile-action-state';
export type {
    MobileArtifactActionErrorCode,
    MobileArtifactActionEvent,
    MobileArtifactActionState,
    MobileArtifactTarget,
} from './mobile-action-state';

export type MobileArtifactNativePort = Readonly<{
    open(request: ClientArtifactTargetRequest): Promise<ClientArtifactViewOpenResult>;
    download(request: ClientArtifactDownloadRequest): Promise<ClientArtifactDownloadResult>;
    progress(operationId: string): Promise<ClientArtifactDownloadProgressResult>;
    cancel(operationId: string): Promise<boolean>;
}>;

export type MobileArtifactViewerPort = Readonly<{
    openUrl(url: string): Promise<void>;
}>;

export type MobileArtifactSharePort = Readonly<{
    shareVerifiedFile(result: ClientArtifactDownloadResult): Promise<void>;
}>;

export type MobileArtifactSessionPort = Readonly<{
    currentConnectionGeneration(): number | null;
    refreshAfterUnauthorized(rejectedConnectionGeneration: number): Promise<void>;
}>;

export type MobileArtifactActionPorts = Readonly<{
    native: MobileArtifactNativePort;
    viewer: MobileArtifactViewerPort;
    share: MobileArtifactSharePort;
    session: MobileArtifactSessionPort;
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
            const result = await pioneerClient.artifactDownloadCancel({
                operation_id: operationId,
            });
            return result.operation_id === operationId && result.cancelled;
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
    session: {
        currentConnectionGeneration: activeGatewayConnectionGeneration,
        refreshAfterUnauthorized: refreshActiveGatewaySessionAfterUnauthorized,
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
        // Minting a view grant is a mutation without an idempotency key. Do
        // not retry it automatically: a late authentication/session failure
        // could otherwise leave one valid grant behind and mint a second one.
        // The shared session coordinator still owns refresh, and the user can
        // retry Open after that lifecycle has recovered.
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
    const request = {
        ...nativeTarget(target),
        operation_id: operationId,
    };
    const resultPromise = withCoordinatedAuthenticationRetry(
        () => ports.native.download(request),
        ports.session,
    )
        .then(
            (result) => ({ kind: 'success' as const, result }),
            (error: unknown) => ({ kind: 'failure' as const, error }),
        )
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
        const outcome = await resultPromise;
        if (outcome.kind === 'failure') {
            throw outcome.error;
        }
        const result = outcome.result;
        assertVerifiedNativeResult(result, operationId, target);
        dispatch({ type: 'share-started' });
        await ports.share
            .shareVerifiedFile(result)
            .catch(() => Promise.reject(new MobileArtifactActionError('share_failed')));
        dispatch({ type: 'completed' });
    } catch (error) {
        dispatch({ type: 'failed', code: mobileArtifactErrorCode(error, 'download_failed') });
    }
};

export const cancelMobileArtifactDownload = async (
    operationId: string,
    dispatch: (event: MobileArtifactActionEvent) => void,
    ports: MobileArtifactActionPorts = mobileArtifactActionPorts,
): Promise<boolean> => {
    try {
        const cancelled = await ports.native.cancel(operationId);
        if (!cancelled) {
            return false;
        }
        dispatch({ type: 'failed', code: 'cancelled' });
        return true;
    } catch {
        // A failed cancellation does not make the still-running native
        // operation terminal. Keep its generation and progress state alive so
        // its eventual verified result (or real failure) remains authoritative.
        return false;
    }
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
    if (!path.startsWith('/') || /[\0\r\n]/u.test(path)) {
        throw new MobileArtifactActionError('integrity_failed');
    }
    const encodedPath = path
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');
    return `file://${encodedPath}`;
};

const assertVerifiedNativeResult = (
    result: ClientArtifactDownloadResult,
    operationId: string,
    target: MobileArtifactTarget,
): void => {
    if (
        result.operation_id !== operationId ||
        !result.local_file_path ||
        result.artifact_id !== target.artifactId ||
        !result.version_id ||
        (target.versionId != null && result.version_id !== target.versionId) ||
        !/^[0-9a-f]{64}$/u.test(result.sha256) ||
        !Number.isSafeInteger(result.size_bytes) ||
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

const withCoordinatedAuthenticationRetry = async <T>(
    operation: () => Promise<T>,
    session: MobileArtifactSessionPort,
): Promise<T> => {
    const rejectedConnectionGeneration = session.currentConnectionGeneration();
    try {
        return await operation();
    } catch (error) {
        if (
            rejectedConnectionGeneration === null ||
            !(error instanceof PioneerClientNativeError) ||
            error.code !== 'artifact_authentication_required'
        ) {
            throw error;
        }
        try {
            await session.refreshAfterUnauthorized(rejectedConnectionGeneration);
        } catch {
            // Preserve the typed authentication failure from the storage
            // operation. Session lifecycle/UI receives the terminal refresh
            // result independently from the shared coordinator projection.
            throw error;
        }
        return operation();
    }
};

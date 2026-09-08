import { Linking, Share } from 'react-native';
import {
    beginArtifactAction,
    dispatchArtifact,
    type ArtifactActionIdentity,
    type ArtifactActionKind,
} from '@/client/artifact-actions';

import {
    PioneerClientNativeError,
    pioneerClient,
    type ClientArtifactDownloadRequest,
    type ClientArtifactDownloadResult,
    type ClientArtifactTargetRequest,
    type ClientArtifactViewOpenResult,
} from '@/client';
import {
    activeGatewayConnectionGeneration,
    refreshActiveGatewaySessionAfterUnauthorized,
} from '@/services/gateway/session';
import type { MobileArtifactTarget } from './mobile-action-state';

export { mobileArtifactActionKey } from './mobile-action-state';
export type {
    MobileArtifactActionErrorCode,
    MobileArtifactActionState,
    MobileArtifactTarget,
} from './mobile-action-state';

export type MobileArtifactNativePort = Readonly<{
    open(request: ClientArtifactTargetRequest): Promise<ClientArtifactViewOpenResult>;
    download(request: ClientArtifactDownloadRequest): Promise<ClientArtifactDownloadResult>;
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
    workflow: Readonly<{
        begin(
            target: MobileArtifactTarget,
            action: ArtifactActionKind,
        ): ArtifactActionIdentity | null;
        claim(identity: ArtifactActionIdentity): boolean;
        complete(identity: ArtifactActionIdentity, error: string | null): void;
        fail(identity: ArtifactActionIdentity, code: string): void;
        cancel(identity: ArtifactActionIdentity): boolean;
    }>;
}>;

export const mobileArtifactActionPorts: MobileArtifactActionPorts = {
    native: {
        open: (request) => pioneerClient.artifactViewOpen(request),
        download: (request) => pioneerClient.artifactDownload(request),
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
    workflow: {
        begin: (target, action) =>
            target.threadId
                ? beginArtifactAction(
                      target.threadId,
                      target.artifactId,
                      target.versionId ?? null,
                      action,
                  )
                : null,
        claim: (identity) => dispatchArtifact({ kind: 'claim_presentation', identity }),
        complete: (identity, error) => {
            dispatchArtifact({ kind: 'complete_presentation', identity, error });
        },
        fail: (identity, code) => {
            dispatchArtifact({ kind: 'fail_preparation', identity, code });
        },
        cancel: (identity) => dispatchArtifact({ kind: 'cancel_action', identity }),
    },
};

export const openMobileArtifact = async (
    target: MobileArtifactTarget,
    ports: MobileArtifactActionPorts = mobileArtifactActionPorts,
): Promise<void> => {
    const identity = ports.workflow.begin(target, 'open');
    if (!identity) return;
    let result: ClientArtifactViewOpenResult;
    try {
        result = await ports.native.open(nativeTarget(target, identity));
    } catch (error) {
        ports.workflow.fail(identity, nativeErrorCode(error, 'viewer_failed'));
        return;
    }
    if (!ports.workflow.claim(identity)) return;
    try {
        await ports.viewer.openUrl(result.view_url);
        ports.workflow.complete(identity, null);
    } catch {
        ports.workflow.complete(identity, 'viewer_failed');
    }
};

export const downloadAndShareMobileArtifact = async (
    target: MobileArtifactTarget,
    operationId: string,
    ports: MobileArtifactActionPorts = mobileArtifactActionPorts,
): Promise<void> => {
    const identity = ports.workflow.begin(target, 'share');
    if (!identity) return;
    let result: ClientArtifactDownloadResult;
    try {
        result = await withCoordinatedAuthenticationRetry(
            () =>
                ports.native.download({
                    ...nativeTarget(target, identity),
                    operation_id: operationId,
                    thread_id: identity.thread_id,
                }),
            ports.session,
        );
    } catch (error) {
        ports.workflow.fail(identity, nativeErrorCode(error, 'download_failed'));
        return;
    }
    if (!ports.workflow.claim(identity)) return;
    try {
        await ports.share.shareVerifiedFile(result);
        ports.workflow.complete(identity, null);
    } catch {
        ports.workflow.complete(identity, 'share_failed');
    }
};

export const cancelMobileArtifactDownload = (
    identity: ArtifactActionIdentity,
    ports: MobileArtifactActionPorts = mobileArtifactActionPorts,
): boolean => ports.workflow.cancel(identity);

const nativeTarget = (
    target: MobileArtifactTarget,
    identity: ArtifactActionIdentity,
): ClientArtifactTargetRequest => ({
    identity,
    workspace_id: target.workspaceId,
    artifact_id: target.artifactId,
    version_id: target.versionId ?? null,
});

const nativeErrorCode = (error: unknown, fallback: string): string =>
    error instanceof PioneerClientNativeError ? (error.code ?? fallback) : fallback;

const localFileUrl = (path: string): string => {
    if (!path.startsWith('/') || /[\0\r\n]/u.test(path)) {
        throw new Error('Invalid native file path');
    }
    const encodedPath = path
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');
    return `file://${encodedPath}`;
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

import { describe, expect, it, jest } from '@jest/globals';
import {
    PioneerClientNativeError,
    type ClientArtifactDownloadProgressResult,
    type ClientArtifactDownloadResult,
} from '@/client';

import {
    cancelMobileArtifactDownload,
    downloadAndShareMobileArtifact,
    mobileArtifactActionKey,
    openMobileArtifact,
    reduceMobileArtifactAction,
    type MobileArtifactActionEvent,
    type MobileArtifactActionPorts,
} from './mobile-actions';

jest.mock('@/client', () => ({
    PioneerClientNativeError: class PioneerClientNativeError extends Error {
        readonly code?: string | null;

        constructor(message: string, code?: string | null) {
            super(message);
            this.code = code;
        }
    },
    pioneerClient: {},
}));

jest.mock('@/services/gateway/session', () => ({
    activeGatewayConnectionGeneration: jest.fn(() => null),
    refreshActiveGatewaySessionAfterUnauthorized: jest.fn(async () => undefined),
}));

const target = { workspaceId: 'workspace-1', artifactId: 'artifact-1', versionId: 'version-1' };

const verifiedDownload: ClientArtifactDownloadResult = {
    operation_id: 'operation-1',
    local_file_path: '/native/verified/artifact.txt',
    display_name: 'artifact.txt',
    artifact_id: 'artifact-1',
    version_id: 'version-1',
    size_bytes: 12,
    sha256: 'a'.repeat(64),
};

const progress: ClientArtifactDownloadProgressResult = {
    operation_id: 'operation-1',
    state: 'downloading',
    downloaded_bytes: 6,
    total_bytes: 12,
    resumed_from_bytes: 2,
};

const fakePorts = (): MobileArtifactActionPorts => ({
    native: {
        open: jest.fn(async () => ({
            view_url: 'https://gateway.test/storage/views/opaque',
            expires_at: 200,
        })),
        download: jest.fn(async () => verifiedDownload),
        progress: jest.fn(async () => progress),
        cancel: jest.fn(async () => true),
    },
    viewer: { openUrl: jest.fn(async () => undefined) },
    share: { shareVerifiedFile: jest.fn(async () => undefined) },
    session: {
        currentConnectionGeneration: jest.fn(() => 7),
        refreshAfterUnauthorized: jest.fn(async () => undefined),
    },
    isForeground: () => true,
    delay: async () => undefined,
    nowUnixSeconds: () => 100,
});

describe('mobile artifact native actions', () => {
    it('opens only the ephemeral native view result and does not download', async () => {
        const ports = fakePorts();
        const events: MobileArtifactActionEvent[] = [];

        await openMobileArtifact(target, (event) => events.push(event), ports);

        expect(ports.native.open).toHaveBeenCalledWith({
            workspace_id: 'workspace-1',
            artifact_id: 'artifact-1',
            version_id: 'version-1',
        });
        expect(ports.native.download).not.toHaveBeenCalled();
        expect(ports.viewer.openUrl).toHaveBeenCalledTimes(1);
        expect(events).toEqual([{ type: 'open-started' }, { type: 'completed' }]);
    });

    it('does not retry the non-idempotent view-grant mint', async () => {
        const basePorts = fakePorts();
        const open = jest.fn<MobileArtifactActionPorts['native']['open']>(() =>
            Promise.reject(
                new PioneerClientNativeError('access expired', 'artifact_authentication_required'),
            ),
        );
        const ports: MobileArtifactActionPorts = {
            ...basePorts,
            native: { ...basePorts.native, open },
        };
        const events: MobileArtifactActionEvent[] = [];

        await openMobileArtifact(target, (event) => events.push(event), ports);

        expect(open).toHaveBeenCalledTimes(1);
        expect(ports.session.refreshAfterUnauthorized).not.toHaveBeenCalled();
        expect(events.at(-1)).toEqual({ type: 'failed', code: 'authentication_required' });
    });

    it('shares only the verified native result and resumes polling in foreground', async () => {
        const ports = fakePorts();
        const events: MobileArtifactActionEvent[] = [];

        await downloadAndShareMobileArtifact(
            target,
            'operation-1',
            (event) => events.push(event),
            ports,
        );

        expect(ports.share.shareVerifiedFile).toHaveBeenCalledWith(verifiedDownload);
        expect(events.at(-1)).toEqual({ type: 'completed' });
    });

    it('keeps native download alive in background and resumes progress polling', async () => {
        let resolveDownload: (result: ClientArtifactDownloadResult) => void = () => undefined;
        let foreground = false;
        let delays = 0;
        const basePorts = fakePorts();
        const download = new Promise<ClientArtifactDownloadResult>((resolve) => {
            resolveDownload = resolve;
        });
        const ports: MobileArtifactActionPorts = {
            ...basePorts,
            native: {
                ...basePorts.native,
                download: jest.fn(() => download),
            },
            isForeground: () => foreground,
            delay: async () => {
                delays += 1;
                if (delays === 1) {
                    foreground = true;
                } else {
                    resolveDownload(verifiedDownload);
                    await Promise.resolve();
                }
            },
        };

        await downloadAndShareMobileArtifact(target, 'operation-1', () => undefined, ports);

        expect(ports.native.progress).toHaveBeenCalled();
        expect(ports.share.shareVerifiedFile).toHaveBeenCalledWith(verifiedDownload);
    });

    it('never shares an incomplete native result', async () => {
        const basePorts = fakePorts();
        const ports: MobileArtifactActionPorts = {
            ...basePorts,
            native: {
                ...basePorts.native,
                download: jest.fn(async () => ({
                    ...verifiedDownload,
                    sha256: '',
                })),
            },
        };
        const events: MobileArtifactActionEvent[] = [];

        await downloadAndShareMobileArtifact(
            target,
            'operation-1',
            (event) => events.push(event),
            ports,
        );

        expect(ports.share.shareVerifiedFile).not.toHaveBeenCalled();
        expect(events.at(-1)).toEqual({ type: 'failed', code: 'integrity_failed' });
    });

    it('cancels the same native operation deterministically', async () => {
        const ports = fakePorts();
        const events: MobileArtifactActionEvent[] = [];

        await expect(
            cancelMobileArtifactDownload('operation-1', (event) => events.push(event), ports),
        ).resolves.toBe(true);

        expect(ports.native.cancel).toHaveBeenCalledWith('operation-1');
        expect(events).toEqual([{ type: 'failed', code: 'cancelled' }]);
    });

    it('keeps the active download authoritative when native cancellation fails', async () => {
        const basePorts = fakePorts();
        const ports: MobileArtifactActionPorts = {
            ...basePorts,
            native: {
                ...basePorts.native,
                cancel: jest.fn(async () => {
                    throw new Error('cancel failed');
                }),
            },
        };
        const events: MobileArtifactActionEvent[] = [];

        await expect(
            cancelMobileArtifactDownload('operation-1', (event) => events.push(event), ports),
        ).resolves.toBe(false);

        expect(events).toEqual([]);
    });

    it('does not overwrite a native terminal result when cancellation is too late', async () => {
        const basePorts = fakePorts();
        const ports: MobileArtifactActionPorts = {
            ...basePorts,
            native: {
                ...basePorts.native,
                cancel: jest.fn(async () => false),
            },
        };
        const events: MobileArtifactActionEvent[] = [];

        await expect(
            cancelMobileArtifactDownload('operation-1', (event) => events.push(event), ports),
        ).resolves.toBe(false);

        expect(events).toEqual([]);
    });

    it('keeps reducer state secret-free', () => {
        const state = reduceMobileArtifactAction(
            { kind: 'idle' },
            { type: 'download-progress', progress },
        );

        expect(state).toEqual({
            kind: 'downloading',
            operationId: 'operation-1',
            downloadedBytes: 6,
            totalBytes: 12,
        });
        expect(JSON.stringify(state)).not.toContain('Authorization');
        expect(JSON.stringify(state)).not.toContain('/storage/views/');
    });

    it('keys concurrent actions by exact artifact version', () => {
        expect(mobileArtifactActionKey('workspace-1', 'artifact-1', 'version-1')).not.toBe(
            mobileArtifactActionKey('workspace-1', 'artifact-1', 'version-2'),
        );
        expect(mobileArtifactActionKey('workspace-1', 'artifact-1', 'version-1')).not.toBe(
            mobileArtifactActionKey('workspace-2', 'artifact-1', 'version-1'),
        );
    });

    it('refreshes through the shared session coordinator and retries an idempotent download once', async () => {
        const basePorts = fakePorts();
        const download = jest
            .fn<MobileArtifactActionPorts['native']['download']>()
            .mockRejectedValueOnce(
                new PioneerClientNativeError('access expired', 'artifact_authentication_required'),
            )
            .mockResolvedValueOnce(verifiedDownload);
        const ports: MobileArtifactActionPorts = {
            ...basePorts,
            native: { ...basePorts.native, download },
        };
        const events: MobileArtifactActionEvent[] = [];

        await downloadAndShareMobileArtifact(
            target,
            'operation-1',
            (event) => events.push(event),
            ports,
        );

        expect(ports.session.refreshAfterUnauthorized).toHaveBeenCalledWith(7);
        expect(download).toHaveBeenCalledTimes(2);
        expect(events.at(-1)).toEqual({ type: 'completed' });
    });

    it('does not retry a non-authentication download failure', async () => {
        const basePorts = fakePorts();
        const download = jest.fn<MobileArtifactActionPorts['native']['download']>(() =>
            Promise.reject(new PioneerClientNativeError('disk full', 'disk_full')),
        );
        const ports: MobileArtifactActionPorts = {
            ...basePorts,
            native: { ...basePorts.native, download },
        };
        const events: MobileArtifactActionEvent[] = [];

        await downloadAndShareMobileArtifact(
            target,
            'operation-1',
            (event) => events.push(event),
            ports,
        );

        expect(ports.session.refreshAfterUnauthorized).not.toHaveBeenCalled();
        expect(download).toHaveBeenCalledTimes(1);
        expect(events.at(-1)).toEqual({ type: 'failed', code: 'disk_full' });
    });
});

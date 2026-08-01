import { describe, expect, it, jest } from '@jest/globals';
import type { ClientArtifactDownloadProgressResult, ClientArtifactDownloadResult } from '@/client';

import {
    cancelMobileArtifactDownload,
    downloadAndShareMobileArtifact,
    openMobileArtifact,
    reduceMobileArtifactAction,
    type MobileArtifactActionEvent,
    type MobileArtifactActionPorts,
} from './mobile-actions';

jest.mock('@/client', () => ({
    PioneerClientNativeError: class PioneerClientNativeError extends Error {
        readonly code: string;

        constructor(code: string) {
            super(code);
            this.code = code;
        }
    },
    pioneerClient: {},
}));

const target = { workspaceId: 'workspace-1', artifactId: 'artifact-1', versionId: null };

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
        cancel: jest.fn(async () => undefined),
    },
    viewer: { openUrl: jest.fn(async () => undefined) },
    share: { shareVerifiedFile: jest.fn(async () => undefined) },
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
            version_id: null,
        });
        expect(ports.native.download).not.toHaveBeenCalled();
        expect(ports.viewer.openUrl).toHaveBeenCalledTimes(1);
        expect(events).toEqual([{ type: 'open-started' }, { type: 'completed' }]);
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

        await cancelMobileArtifactDownload('operation-1', (event) => events.push(event), ports);

        expect(ports.native.cancel).toHaveBeenCalledWith('operation-1');
        expect(events).toEqual([{ type: 'failed', code: 'cancelled' }]);
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
});

import { describe, expect, it, jest } from '@jest/globals';
import { PioneerClientNativeError, type ClientArtifactDownloadResult } from '@/client';
import {
    cancelMobileArtifactDownload,
    downloadAndShareMobileArtifact,
    openMobileArtifact,
    type MobileArtifactActionPorts,
} from './mobile-actions';

jest.mock('@/client', () => ({
    PioneerClientNativeError: class extends Error {
        readonly code?: string | null;
        constructor(message: string, code?: string | null) {
            super(message);
            this.code = code;
        }
    },
    pioneerClient: {},
}));
jest.mock('@/client/artifact-actions', () => ({
    beginArtifactAction: jest.fn(),
    dispatchArtifact: jest.fn(),
}));
jest.mock('@/services/gateway/session', () => ({
    activeGatewayConnectionGeneration: jest.fn(() => null),
    refreshActiveGatewaySessionAfterUnauthorized: jest.fn(async () => undefined),
}));

const target = {
    threadId: 'thread',
    workspaceId: 'workspace-1',
    artifactId: 'artifact-1',
    versionId: 'version-1',
};
const identity = {
    thread_id: 'thread',
    artifact_id: 'artifact-1',
    version_id: 'version-1',
    generation: 7,
};
const verified: ClientArtifactDownloadResult = {
    operation_id: 'operation-1',
    local_file_path: '/native/verified/artifact.txt',
    display_name: 'artifact.txt',
    artifact_id: 'artifact-1',
    version_id: 'version-1',
    size_bytes: 12,
    sha256: 'a'.repeat(64),
};
const fakePorts = (): MobileArtifactActionPorts => ({
    native: {
        open: jest.fn(async () => ({
            view_url: 'https://gateway.test/storage/views/opaque',
            expires_at: 200,
        })),
        download: jest.fn(async () => verified),
    },
    viewer: { openUrl: jest.fn(async () => undefined) },
    share: { shareVerifiedFile: jest.fn(async () => undefined) },
    session: {
        currentConnectionGeneration: jest.fn(() => 7),
        refreshAfterUnauthorized: jest.fn(async () => undefined),
    },
    workflow: {
        begin: jest.fn(() => identity),
        claim: jest.fn(() => true),
        complete: jest.fn(),
        fail: jest.fn(),
        cancel: jest.fn(() => true),
    },
});

describe('mobile artifact native adapter', () => {
    it('passes the Client identity into preparation and claims the browser handoff', async () => {
        const ports = fakePorts();
        await openMobileArtifact(target, ports);
        expect(ports.workflow.begin).toHaveBeenCalledWith(target, 'open');
        expect(ports.native.open).toHaveBeenCalledWith({
            identity,
            workspace_id: 'workspace-1',
            artifact_id: 'artifact-1',
            version_id: 'version-1',
        });
        expect(ports.native.download).not.toHaveBeenCalled();
        expect(ports.workflow.claim).toHaveBeenCalledWith(identity);
        expect(ports.viewer.openUrl).toHaveBeenCalledTimes(1);
        expect(ports.workflow.complete).toHaveBeenCalledWith(identity, null);
    });
    it('does not execute a duplicate action rejected by Client', async () => {
        const base = fakePorts();
        const ports = { ...base, workflow: { ...base.workflow, begin: jest.fn(() => null) } };
        await openMobileArtifact(target, ports);
        await downloadAndShareMobileArtifact(target, 'operation-1', ports);
        expect(ports.native.open).not.toHaveBeenCalled();
        expect(ports.native.download).not.toHaveBeenCalled();
    });
    it('never opens a stale, cancelled or expired prepared grant rejected by Client', async () => {
        const base = fakePorts();
        const ports = { ...base, workflow: { ...base.workflow, claim: jest.fn(() => false) } };
        await openMobileArtifact(target, ports);
        expect(ports.viewer.openUrl).not.toHaveBeenCalled();
        expect(ports.workflow.complete).not.toHaveBeenCalled();
    });
    it('does not retry a non-idempotent view grant', async () => {
        const base = fakePorts();
        const ports = {
            ...base,
            native: {
                ...base.native,
                open: jest.fn(async () => {
                    throw new PioneerClientNativeError(
                        'expired',
                        'artifact_authentication_required',
                    );
                }),
            },
        };
        await openMobileArtifact(target, ports);
        expect(ports.native.open).toHaveBeenCalledTimes(1);
        expect(ports.session.refreshAfterUnauthorized).not.toHaveBeenCalled();
        expect(ports.workflow.fail).toHaveBeenCalledWith(
            identity,
            'artifact_authentication_required',
        );
    });
    it('reports a native viewer failure to the same Client operation', async () => {
        const base = fakePorts();
        const ports = {
            ...base,
            viewer: {
                openUrl: jest.fn(async () => {
                    throw new Error('native failure');
                }),
            },
        };
        await openMobileArtifact(target, ports);
        expect(ports.workflow.complete).toHaveBeenCalledWith(identity, 'viewer_failed');
    });
    it('waits for the verified native result, then claims the share handoff', async () => {
        let complete!: (result: ClientArtifactDownloadResult) => void;
        const waiting = new Promise<ClientArtifactDownloadResult>((resolve) => {
            complete = resolve;
        });
        const base = fakePorts();
        const ports = { ...base, native: { ...base.native, download: jest.fn(() => waiting) } };
        const task = downloadAndShareMobileArtifact(target, 'operation-1', ports);
        await Promise.resolve();
        expect(ports.share.shareVerifiedFile).not.toHaveBeenCalled();
        complete(verified);
        await task;
        expect(ports.native.download).toHaveBeenCalledWith({
            identity,
            thread_id: 'thread',
            workspace_id: 'workspace-1',
            artifact_id: 'artifact-1',
            version_id: 'version-1',
            operation_id: 'operation-1',
        });
        expect(ports.share.shareVerifiedFile).toHaveBeenCalledWith(verified);
        expect(ports.workflow.complete).toHaveBeenCalledWith(identity, null);
    });
    it('does not share a late download after Client retires its route', async () => {
        const base = fakePorts();
        const ports = { ...base, workflow: { ...base.workflow, claim: jest.fn(() => false) } };
        await downloadAndShareMobileArtifact(target, 'operation-1', ports);
        expect(ports.share.shareVerifiedFile).not.toHaveBeenCalled();
    });
    it('reports integrity failure without invoking a native share', async () => {
        const base = fakePorts();
        const ports = {
            ...base,
            native: {
                ...base.native,
                download: jest.fn(async () => {
                    throw new PioneerClientNativeError('verification failed', 'integrity_failed');
                }),
            },
        };
        await downloadAndShareMobileArtifact(target, 'operation-1', ports);
        expect(ports.share.shareVerifiedFile).not.toHaveBeenCalled();
        expect(ports.workflow.fail).toHaveBeenCalledWith(identity, 'integrity_failed');
    });
    it('reports native Share failure without reducing domain state in JavaScript', async () => {
        const base = fakePorts();
        const ports = {
            ...base,
            share: {
                shareVerifiedFile: jest.fn(async () => {
                    throw new Error('native failure');
                }),
            },
        };
        await downloadAndShareMobileArtifact(target, 'operation-1', ports);
        expect(ports.workflow.complete).toHaveBeenCalledWith(identity, 'share_failed');
    });
    it('uses the existing session coordinator for one authenticated transfer retry', async () => {
        const base = fakePorts();
        const download = jest
            .fn<MobileArtifactActionPorts['native']['download']>()
            .mockRejectedValueOnce(
                new PioneerClientNativeError('expired', 'artifact_authentication_required'),
            )
            .mockResolvedValueOnce(verified);
        const ports = { ...base, native: { ...base.native, download } };
        await downloadAndShareMobileArtifact(target, 'operation-1', ports);
        expect(ports.session.refreshAfterUnauthorized).toHaveBeenCalledWith(7);
        expect(download).toHaveBeenCalledTimes(2);
        expect(ports.share.shareVerifiedFile).toHaveBeenCalledTimes(1);
    });
    it('cancels the captured action identity through Client', () => {
        const ports = fakePorts();
        expect(cancelMobileArtifactDownload(identity, ports)).toBe(true);
        expect(ports.workflow.cancel).toHaveBeenCalledWith(identity);
    });
});

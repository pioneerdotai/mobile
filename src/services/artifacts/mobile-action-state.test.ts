import { describe, expect, it } from '@jest/globals';
import type { ArtifactPublication } from '@/client/generated/artifact_publication';
import { artifactActionPresentation, mobileArtifactActionKey } from './mobile-action-state';

const publication = (): ArtifactPublication => ({
    thread_id: 'thread',
    workspace_id: 'workspace',
    generation: 1,
    revision: 1,
    request: { kind: 'ready' },
    items: [],
    previews: [],
    actions: ['a', 'b'].map((id, index) => ({
        identity: {
            thread_id: 'thread',
            artifact_id: id,
            version_id: 'version',
            generation: index + 1,
        },
        target: {
            thread_id: 'thread',
            workspace_id: 'workspace',
            artifact_id: id,
            version_id: 'version',
        },
        action: 'share',
        state: { kind: 'resolving' },
        expires_at: null,
        download: { operation_id: id, generation: index + 3 },
    })),
    downloads: ['a', 'b'].map((id, index) => ({
        identity: { operation_id: id, generation: index + 3 },
        target: {
            thread_id: 'thread',
            workspace_id: 'workspace',
            artifact_id: id,
            version_id: 'version',
        },
        state: 'downloading',
        downloaded_bytes: index + 5,
        total_bytes: 10,
        resumed_from_bytes: 0,
        error_code: null,
    })),
});

describe('artifact publication presentation', () => {
    it('keeps action/progress identity under reorder/removal and rejects a reused transfer generation', () => {
        const input = publication();
        const before = artifactActionPresentation(input);
        const a = mobileArtifactActionKey('workspace', 'a', 'version');
        const b = mobileArtifactActionKey('workspace', 'b', 'version');
        expect(before[a]).toEqual({
            kind: 'downloading',
            operationId: 'a',
            downloadedBytes: 5,
            totalBytes: 10,
        });
        expect(
            artifactActionPresentation({
                ...input,
                actions: [...input.actions].reverse(),
                downloads: [...input.downloads].reverse(),
            }),
        ).toEqual(before);
        const onlyB = artifactActionPresentation({ ...input, actions: input.actions.slice(1) });
        expect(onlyB[a]).toBeUndefined();
        expect(onlyB[b]).toEqual(before[b]);
        const replaced = artifactActionPresentation({
            ...input,
            downloads: input.downloads.map((d) => ({
                ...d,
                identity: { ...d.identity, generation: 99 },
            })),
        });
        expect(replaced[a]).toEqual({
            kind: 'downloading',
            operationId: 'a',
            downloadedBytes: 0,
            totalBytes: 0,
        });
        expect(input.downloads[0].identity.generation).toBe(3);
    });
});

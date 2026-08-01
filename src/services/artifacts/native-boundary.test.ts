import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from '@jest/globals';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('mobile artifact native boundary', () => {
    it('keeps bearer credentials and HTTP headers out of TypeScript artifact actions', () => {
        const actions = source('src/services/artifacts/mobile-actions.ts');
        const request = source('src/client/generated/client_artifact_download_request.ts');
        const view = source('src/client/generated/client_artifact_view_open_result.ts');
        const combined = `${actions}\n${request}\n${view}`;

        expect(combined).not.toContain('Authorization');
        expect(combined).not.toContain('access_token');
        expect(combined).not.toContain('refresh_token');
        expect(actions).not.toContain('fetch(');
    });

    it('exposes only native view and verified download operations to the UI', () => {
        const actions = source('src/services/artifacts/mobile-actions.ts');
        expect(actions).toContain('pioneerClient.artifactViewOpen');
        expect(actions).toContain('pioneerClient.artifactDownload');
        expect(actions).toContain('shareVerifiedFile(result)');
        expect(actions).not.toContain('artifactDownloadStart');
        expect(actions).not.toContain('artifactDownloadChunk');
    });

    it('does not persist view grants in Zustand or MMKV stores', () => {
        for (const path of ['src/stores/gateway.ts', 'src/stores/active-thread.ts']) {
            const store = source(path);
            expect(store).not.toContain('/storage/views/');
            expect(store).not.toContain('viewGrant');
            expect(store).not.toContain('view_url');
        }
    });
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { pioneerClient } from '@/client';

import { refreshCliRuntimeSummaries } from './cli-runtime-live';

jest.mock('@/client', () => ({
    pioneerClient: {
        cliRuntimeRefresh: jest.fn(),
    },
}));

describe('live CLI runtime capability loading', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('uses the readiness-backed refresh endpoint instead of the catalog list', async () => {
        const runtimes = [{ runtime_id: 'codex' }];
        jest.mocked(pioneerClient.cliRuntimeRefresh).mockResolvedValue({ runtimes } as never);

        await expect(refreshCliRuntimeSummaries(' workspace-1 ')).resolves.toBe(runtimes);
        expect(pioneerClient.cliRuntimeRefresh).toHaveBeenCalledWith({
            workspace_id: 'workspace-1',
        });
    });

    it('deduplicates concurrent probes for one workspace', async () => {
        let resolveRefresh: ((value: { runtimes: never[] }) => void) | undefined;
        jest.mocked(pioneerClient.cliRuntimeRefresh).mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveRefresh = resolve;
                }) as never,
        );

        const first = refreshCliRuntimeSummaries('workspace-1');
        const second = refreshCliRuntimeSummaries('workspace-1');

        expect(pioneerClient.cliRuntimeRefresh).toHaveBeenCalledTimes(1);
        resolveRefresh?.({ runtimes: [] });
        await expect(Promise.all([first, second])).resolves.toEqual([[], []]);
    });

    it('clears a failed in-flight request so the next load can retry', async () => {
        jest.mocked(pioneerClient.cliRuntimeRefresh)
            .mockRejectedValueOnce(new Error('probe failed'))
            .mockResolvedValueOnce({ runtimes: [] });

        await expect(refreshCliRuntimeSummaries('workspace-1')).rejects.toThrow('probe failed');
        await expect(refreshCliRuntimeSummaries('workspace-1')).resolves.toEqual([]);
        expect(pioneerClient.cliRuntimeRefresh).toHaveBeenCalledTimes(2);
    });
});

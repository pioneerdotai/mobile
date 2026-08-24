import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { pioneerClient } from '@/client';

import {
    applyCliRuntimeSummaryUpdate,
    clearCliRuntimeSummaries,
    cliRuntimeSummariesSnapshot,
    loadCliRuntimeSummaries,
    subscribeCliRuntimeSummaries,
} from './cli-runtime-snapshot';

jest.mock('@/client', () => ({
    pioneerClient: {
        cliRuntimeList: jest.fn(),
    },
}));

describe('Gateway-owned CLI runtime snapshots', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearCliRuntimeSummaries();
    });

    it('reads the snapshot endpoint and never asks Mobile to probe providers', async () => {
        const runtimes = [{ runtime_id: 'codex' }];
        jest.mocked(pioneerClient.cliRuntimeList).mockResolvedValue({
            revision: 1,
            runtimes,
        } as never);

        await expect(loadCliRuntimeSummaries(' workspace-readiness ')).resolves.toBe(runtimes);
        expect(pioneerClient.cliRuntimeList).toHaveBeenCalledWith({
            workspace_id: 'workspace-readiness',
        });
    });

    it('deduplicates concurrent snapshot reads for one workspace', async () => {
        let resolveLoad: ((value: { runtimes: never[] }) => void) | undefined;
        jest.mocked(pioneerClient.cliRuntimeList).mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveLoad = resolve;
                }) as never,
        );

        const first = loadCliRuntimeSummaries('workspace-concurrent');
        const second = loadCliRuntimeSummaries('workspace-concurrent');

        expect(pioneerClient.cliRuntimeList).toHaveBeenCalledTimes(1);
        resolveLoad?.({ revision: 1, runtimes: [] } as never);
        await expect(Promise.all([first, second])).resolves.toEqual([[], []]);
    });

    it('applies contiguous Gateway status notifications without another RPC', async () => {
        const initial = { runtime_id: 'claude', status: { state: 'initializing' } };
        jest.mocked(pioneerClient.cliRuntimeList).mockResolvedValue({
            revision: 1,
            runtimes: [initial],
        } as never);
        await loadCliRuntimeSummaries('workspace-listener');

        const listener = jest.fn();
        const unsubscribe = subscribeCliRuntimeSummaries('workspace-listener', listener);
        const runtime = { runtime_id: 'claude', status: { state: 'ready' } };

        applyCliRuntimeSummaryUpdate('workspace-listener', 2, runtime as never, false);
        applyCliRuntimeSummaryUpdate('workspace-listener', 2, initial as never, false);

        expect(cliRuntimeSummariesSnapshot('workspace-listener')).toEqual([runtime]);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(pioneerClient.cliRuntimeList).toHaveBeenCalledTimes(1);
        unsubscribe();
    });

    it('does not repopulate an authorization-cleared cache from an old response', async () => {
        let resolveLoad: ((value: { runtimes: never[] }) => void) | undefined;
        jest.mocked(pioneerClient.cliRuntimeList).mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveLoad = resolve;
                }) as never,
        );
        const load = loadCliRuntimeSummaries('workspace-revoked');

        clearCliRuntimeSummaries('workspace-revoked');
        resolveLoad?.({
            revision: 1,
            runtimes: [{ runtime_id: 'codex-secret' }] as never[],
        } as never);
        await expect(load).resolves.toEqual([]);

        expect(cliRuntimeSummariesSnapshot('workspace-revoked')).toEqual([]);
    });

    it('does not let an older list response overwrite a newer notification', async () => {
        const initializing = { runtime_id: 'codex', status: { state: 'initializing' } };
        jest.mocked(pioneerClient.cliRuntimeList).mockResolvedValueOnce({
            revision: 1,
            runtimes: [initializing],
        } as never);
        await loadCliRuntimeSummaries('workspace-race');

        let resolveLoad: ((value: { revision: number; runtimes: never[] }) => void) | undefined;
        jest.mocked(pioneerClient.cliRuntimeList).mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveLoad = resolve;
                }) as never,
        );
        const load = loadCliRuntimeSummaries('workspace-race');
        const ready = { runtime_id: 'codex', status: { state: 'ready' } };

        applyCliRuntimeSummaryUpdate('workspace-race', 2, ready as never, false);
        resolveLoad?.({
            revision: 1,
            runtimes: [initializing] as never[],
        });

        await expect(load).resolves.toEqual([ready]);
        expect(cliRuntimeSummariesSnapshot('workspace-race')).toEqual([ready]);
    });

    it('removes a runtime when Gateway deletes it from the catalog', async () => {
        const runtime = { runtime_id: 'claude', status: { state: 'ready' } };
        jest.mocked(pioneerClient.cliRuntimeList).mockResolvedValue({
            revision: 1,
            runtimes: [runtime],
        } as never);
        await loadCliRuntimeSummaries('workspace-removal');

        applyCliRuntimeSummaryUpdate('workspace-removal', 2, runtime as never, true);

        expect(cliRuntimeSummariesSnapshot('workspace-removal')).toEqual([]);
    });

    it('reloads the complete snapshot when a notification revision has a gap', async () => {
        const codex = { runtime_id: 'codex', status: { state: 'initializing' } };
        const claude = { runtime_id: 'claude', status: { state: 'ready' } };
        jest.mocked(pioneerClient.cliRuntimeList)
            .mockResolvedValueOnce({ revision: 1, runtimes: [codex, claude] } as never)
            .mockResolvedValueOnce({
                revision: 3,
                runtimes: [{ ...codex, status: { state: 'ready' } }],
            } as never);
        await loadCliRuntimeSummaries('workspace-gap');

        applyCliRuntimeSummaryUpdate(
            'workspace-gap',
            3,
            { ...codex, status: { state: 'ready' } } as never,
            false,
        );

        await loadCliRuntimeSummaries('workspace-gap');
        expect(cliRuntimeSummariesSnapshot('workspace-gap')).toEqual([
            { ...codex, status: { state: 'ready' } },
        ]);
        expect(pioneerClient.cliRuntimeList).toHaveBeenCalledTimes(2);
    });
});

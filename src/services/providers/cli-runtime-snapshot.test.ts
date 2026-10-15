import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { mobileClientBinding } from '@/client/mobile-client-binding';
import {
    cliRuntimeSummariesSnapshot,
    loadCliRuntimeSummariesInBackground,
    subscribeCliRuntimeSummaries,
} from './cli-runtime-snapshot';

let mockPublication: unknown = null;
const mockUnsubscribe = jest.fn();
const mockSubscribe = jest.fn(() => mockUnsubscribe);
jest.mock('@/client/mobile-client-binding', () => ({
    mobileClientBinding: {
        scope: jest.fn(() => ({
            getSnapshot: () => ({ payload: mockPublication }),
            subscribe: mockSubscribe,
        })),
        dispatch: jest.fn(),
        drain: jest.fn(),
    },
}));

describe('Client runtime snapshot adapter', () => {
    beforeEach(() => {
        mockPublication = null;
        jest.clearAllMocks();
    });
    it('returns the immutable Client array without creating a second snapshot', () => {
        const runtimes = [{ runtime_id: 'synthetic', id: 'synthetic', revision: 1 }];
        mockPublication = { workspace_id: 'workspace', runtimes };
        expect(cliRuntimeSummariesSnapshot('workspace')).toBe(runtimes);
        expect(cliRuntimeSummariesSnapshot('workspace')).toBe(runtimes);
        expect(mobileClientBinding.dispatch).not.toHaveBeenCalled();
    });
    it('retains and releases exactly one demand for each subscription', () => {
        const listener = jest.fn();
        const release = subscribeCliRuntimeSummaries(' workspace ', listener);
        expect(mockSubscribe).toHaveBeenCalledWith(listener);
        expect(mobileClientBinding.dispatch).toHaveBeenNthCalledWith(1, {
            schema_version: 1,
            intent: {
                kind: 'provider_runtime',
                intent: { kind: 'observe', workspace_id: 'workspace' },
            },
        });
        release();
        release();
        expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
        expect(mobileClientBinding.dispatch).toHaveBeenCalledTimes(2);
        expect(mobileClientBinding.dispatch).toHaveBeenLastCalledWith({
            schema_version: 1,
            intent: {
                kind: 'provider_runtime',
                intent: { kind: 'release', workspace_id: 'workspace' },
            },
        });
    });
    it('requests prefetch through the typed Client path without a JS retry loop', () => {
        loadCliRuntimeSummariesInBackground('workspace');
        expect(mobileClientBinding.dispatch).toHaveBeenCalledWith({
            schema_version: 1,
            intent: {
                kind: 'provider_runtime',
                intent: { kind: 'refresh', workspace_id: 'workspace' },
            },
        });
        expect(mobileClientBinding.drain).toHaveBeenCalledWith({
            kind: 'provider_runtime',
            workspace_id: 'workspace',
        });
    });
    it('uses a stable empty snapshot and does not request an empty workspace', () => {
        expect(cliRuntimeSummariesSnapshot('')).toBe(cliRuntimeSummariesSnapshot(''));
        subscribeCliRuntimeSummaries('', jest.fn())();
        loadCliRuntimeSummariesInBackground('  ');
        expect(mobileClientBinding.dispatch).not.toHaveBeenCalled();
    });
    it('unsubscribes if starting Client demand fails during subscription', () => {
        jest.mocked(mobileClientBinding.dispatch).mockImplementationOnce(() => {
            throw new Error('bridge unavailable');
        });
        expect(() => subscribeCliRuntimeSummaries('workspace', jest.fn())).toThrow(
            'bridge unavailable',
        );
        expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
    it('propagates bridge errors instead of converting failure into ready', () => {
        jest.mocked(mobileClientBinding.dispatch).mockImplementationOnce(() => {
            throw new Error('bridge unavailable');
        });
        expect(() => loadCliRuntimeSummariesInBackground('workspace')).toThrow(
            'bridge unavailable',
        );
    });
});

import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockClearActiveThread = jest.fn<() => Promise<void>>();
const mockResetActiveThread = jest.fn();
const mockResetThreadTree = jest.fn();
const mockQueryClient = { id: 'pioneer-query-client' };
const mockClearThreadQueryCache = jest.fn<(client: typeof mockQueryClient) => Promise<void>>();

jest.mock('@/services/query/client', () => ({
    pioneerQueryClient: mockQueryClient,
}));

jest.mock('@/services/threads/active', () => ({
    clearActiveThread: mockClearActiveThread,
}));

jest.mock('@/services/threads/timeline-query', () => ({
    clearThreadQueryCache: mockClearThreadQueryCache,
}));

jest.mock('@/stores/active-thread', () => ({
    useActiveThreadStore: {
        getState: () => ({
            reset: mockResetActiveThread,
        }),
    },
}));

jest.mock('@/stores/thread-tree', () => ({
    useThreadTreeStore: {
        getState: () => ({
            reset: mockResetThreadTree,
        }),
    },
}));

const { useActiveThreadCleanup } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./use-active-thread-cleanup') as typeof import('./use-active-thread-cleanup');

describe('useActiveThreadCleanup', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockClearActiveThread.mockResolvedValue();
        mockClearThreadQueryCache.mockResolvedValue();
    });

    it('works before QueryClientProvider is mounted and clears the shared query client', async () => {
        let cleanup: (() => Promise<void>) | null = null;
        let tree: ReactTestRenderer | null = null;

        const Harness = () => {
            cleanup = useActiveThreadCleanup();
            return null;
        };

        await act(async () => {
            tree = renderer.create(<Harness />);
        });

        await act(async () => {
            await cleanup!();
        });

        expect(mockClearThreadQueryCache).toHaveBeenCalledWith(mockQueryClient);
        expect(mockClearActiveThread).toHaveBeenCalledTimes(1);
        expect(mockResetActiveThread).toHaveBeenCalledTimes(1);
        expect(mockResetThreadTree).not.toHaveBeenCalled();

        await act(async () => {
            tree!.unmount();
        });
    });
});

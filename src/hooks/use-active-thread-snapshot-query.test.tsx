import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { ClientActiveThreadSnapshot } from '@/client';
import {
    cacheActiveThreadSnapshot,
    newestActiveThreadSnapshot,
    timelineQueryKeys,
} from '@/services/threads/timeline-query';

import { useActiveThreadSnapshotQuery } from './use-active-thread-snapshot-query';

jest.mock('@/client', () => ({
    PioneerClientNativeError: class PioneerClientNativeError extends Error {
        code: string | null;

        constructor(message: string, code: string | null = null) {
            super(message);
            this.code = code;
        }
    },
}));

type RenderedSnapshot = {
    threadId: string | null;
    revision: number | null;
    fetching: boolean;
};

const snapshot = (threadId: string, revision: number): ClientActiveThreadSnapshot =>
    ({
        thread_id: threadId,
        projection: { revision },
    }) as unknown as ClientActiveThreadSnapshot;

describe('useActiveThreadSnapshotQuery', () => {
    it('shows the cached parent immediately and keeps it visible during background refresh', async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { gcTime: Infinity, retry: false } },
        });
        const renders: RenderedSnapshot[] = [];
        let tree: ReactTestRenderer | null = null;

        const Probe = ({ threadId }: { threadId: string }) => {
            const query = useActiveThreadSnapshotQuery(threadId);
            renders.push({
                threadId: query.data?.thread_id ?? null,
                revision: query.data?.projection.revision ?? null,
                fetching: query.isFetching,
            });
            return null;
        };

        cacheActiveThreadSnapshot(queryClient, snapshot('parent', 1));
        cacheActiveThreadSnapshot(queryClient, snapshot('child', 1));

        await act(async () => {
            tree = renderer.create(
                <QueryClientProvider client={queryClient}>
                    <Probe threadId="child" />
                </QueryClientProvider>,
            );
        });
        await act(async () => {
            tree!.update(
                <QueryClientProvider client={queryClient}>
                    <Probe threadId="parent" />
                </QueryClientProvider>,
            );
        });

        expect(renders.at(-1)).toMatchObject({
            threadId: 'parent',
            revision: 1,
        });

        let resolveRefresh!: (value: ClientActiveThreadSnapshot) => void;
        let refresh!: Promise<ClientActiveThreadSnapshot>;
        await act(async () => {
            refresh = queryClient.fetchQuery<ClientActiveThreadSnapshot>({
                queryKey: timelineQueryKeys.threadSnapshot('parent'),
                staleTime: 0,
                queryFn: () =>
                    new Promise<ClientActiveThreadSnapshot>((resolve) => {
                        resolveRefresh = resolve;
                    }),
                structuralSharing: (current, incoming) =>
                    newestActiveThreadSnapshot(
                        current as ClientActiveThreadSnapshot | null | undefined,
                        incoming as ClientActiveThreadSnapshot,
                    ),
            });
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(renders.at(-1)).toEqual({
            threadId: 'parent',
            revision: 1,
            fetching: true,
        });

        await act(async () => {
            resolveRefresh(snapshot('parent', 2));
            await refresh;
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(renders.at(-1)).toEqual({
            threadId: 'parent',
            revision: 2,
            fetching: false,
        });

        await act(async () => {
            tree!.unmount();
        });
        queryClient.clear();
    });
});

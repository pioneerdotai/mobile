import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import type { TimelineSnapshot } from '@/client/generated/timeline_snapshot';
import { useThreadTimelineBlocksQuery } from './use-thread-timeline-blocks-query';

let mockSnapshot = { status: 'Idle', has_loaded_page: false } as TimelineSnapshot;
let mockRevision = 1;
const mockListeners = new Set<() => void>();
const mockDispatch = jest.fn(() => ({ outcome: 'changed' }));
jest.mock('./use-thread-presentation', () => ({
    useThreadPresentation: () => ({ snapshot: mockSnapshot }),
}));
jest.mock('@/client/mobile-client-binding', () => ({
    mobileClientBinding: {
        dispatch: () => mockDispatch(),
        scope: () => ({
            getSnapshot: () => ({ revisions: { scoped: mockRevision }, payload: mockSnapshot }),
            subscribe: (listener: () => void) => {
                mockListeners.add(listener);
                return () => {
                    mockListeners.delete(listener);
                };
            },
        }),
    },
}));

const publish = (status: TimelineSnapshot['status'], loaded: boolean) => {
    mockRevision++;
    mockSnapshot = { ...mockSnapshot, status, has_loaded_page: loaded };
    for (const listener of [...mockListeners]) listener();
};

describe('timeline refresh observer', () => {
    it('keeps empty-page loading semantics and completes refresh/cancellation/teardown without retaining a demand lease', async () => {
        let query!: ReturnType<typeof useThreadTimelineBlocksQuery>;
        const Probe = () => {
            query = useThreadTimelineBlocksQuery({ threadId: 'a', enabled: true });
            return null;
        };
        let tree!: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<Probe />);
        });
        expect(query.isLoading).toBe(true);
        let finished = false;
        const refresh = query.refetch().then(() => {
            finished = true;
        });
        publish('Idle', false);
        await Promise.resolve();
        expect(finished).toBe(false);
        publish({ Loading: { request_key: 'newest' } }, false);
        expect(finished).toBe(false);
        publish('Ready', true);
        await refresh;
        expect(finished).toBe(true);
        expect(mockListeners.size).toBe(0);
        await act(async () => {
            tree.update(<Probe />);
        });
        expect(query.isLoading).toBe(false);
        expect(query.hasLoadedPage).toBe(true);
        const cancelled = query.refetch();
        publish({ Loading: { request_key: 'newest' } }, true);
        publish('Idle', true);
        await cancelled;
        expect(mockListeners.size).toBe(0);
        const pending = query.refetch();
        await act(async () => {
            tree.unmount();
        });
        await pending;
        expect(mockListeners.size).toBe(0);
    });
});

it('does not refresh a loaded history when picker or child navigation changes focus', async () => {
    mockSnapshot = { status: 'Ready', has_loaded_page: true } as TimelineSnapshot;
    mockDispatch.mockClear();
    const Probe = ({ enabled }: { enabled: boolean }) => {
        useThreadTimelineBlocksQuery({ threadId: 'parent', enabled });
        return null;
    };
    let root!: ReactTestRenderer;
    await act(async () => {
        root = renderer.create(<Probe enabled />);
    });
    try {
        for (let i = 0; i < 4; i++) {
            await act(async () => {
                root.update(<Probe enabled={false} />);
            });
            await act(async () => {
                root.update(<Probe enabled />);
            });
        }
        expect(mockDispatch).not.toHaveBeenCalled();
    } finally {
        await act(async () => root.unmount());
    }
});

import React from 'react';
import { expect, it, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import { useActiveThread } from './use-active-thread';

const mockOpen = jest.fn(async () => ({}));
let mockComposer: string | null = null;
let mockNavigation = { active_thread_id: 'parent', workspace_id: 'workspace' };
let mockConnection = 1;
const mockActivate = jest.fn((id: string) => {
    mockComposer = id;
});
const mockState = {
    activateComposerThread: mockActivate,
    composerSelectedMode: 'Message',
    setComposerError: jest.fn(),
    setExpandedKeys: jest.fn(),
};
const mockSnapshot = (id: string | null) =>
    id
        ? {
              thread_id: id,
              workspace_id: 'workspace',
              thread: { id, workspace_id: 'workspace' },
              projection: {},
          }
        : null;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/services/threads/active', () => ({
    openActiveThread: () => mockOpen(),
    openActiveThreadById: () => mockOpen(),
}));
jest.mock('@/services/gateway/transport-coordinator', () => ({}));
jest.mock('@/client/composer', () => ({}));
jest.mock('@/client/turn-cancellation', () => ({ useTurnCancellationPublication: () => null }));
jest.mock('@/client/navigation', () => ({
    navigationSnapshot: () => mockNavigation,
    dispatchNavigation: (intent: typeof mockNavigation & { thread_id: string }) => {
        mockNavigation = { active_thread_id: intent.thread_id, workspace_id: intent.workspace_id };
    },
}));
jest.mock('@/client/mobile-client-binding', () => ({
    mobileClientBinding: { scope: () => ({ subscribe: () => () => {}, getSnapshot: () => null }) },
}));
jest.mock('./use-active-thread-snapshot-query', () => ({
    threadSnapshot: (id: string) => mockSnapshot(id),
    useActiveThreadSnapshotQuery: (id: string) => ({
        data: mockSnapshot(id),
        isFetching: false,
        error: null,
    }),
}));
jest.mock('@/stores/gateway', () => ({
    useGatewayStore: (selector: (value: unknown) => unknown) =>
        selector({ connectionId: mockConnection, connectionState: 'Connected' }),
}));
jest.mock('@/stores/active-thread', () => ({
    useActiveThreadStore: Object.assign(
        (selector: (value: unknown) => unknown) => selector(mockState),
        { getState: () => ({ ...mockState, activeComposerThreadId: mockComposer }) },
    ),
}));

it('returning from pickers and a child restores selection without reopening the parent; reconnect still reopens', async () => {
    const Probe = ({ active }: { active: boolean }) => {
        useActiveThread(null, 'workspace', active, 'parent');
        return null;
    };
    let root!: renderer.ReactTestRenderer;
    await act(async () => {
        root = renderer.create(<Probe active />);
    });
    expect(mockOpen).toHaveBeenCalledTimes(1);
    try {
        for (const picker of ['skills', 'mcp', 'models']) {
            await act(async () => {
                root.update(<Probe active={false} />);
            });
            await act(async () => {
                root.update(<Probe active />);
            });
            expect({ picker, opens: mockOpen.mock.calls.length }).toEqual({ picker, opens: 1 });
        }
        await act(async () => {
            root.update(<Probe active={false} />);
        });
        mockComposer = 'child';
        mockNavigation = { active_thread_id: 'child', workspace_id: 'workspace' };
        await act(async () => {
            root.update(<Probe active />);
        });
        expect(mockOpen).toHaveBeenCalledTimes(1);
        expect(mockComposer).toBe('parent');
        expect(mockNavigation.active_thread_id).toBe('parent');
        mockConnection = 2;
        await act(async () => {
            root.update(<Probe active />);
        });
        expect(mockOpen).toHaveBeenCalledTimes(2);
    } finally {
        await act(async () => root.unmount());
    }
});

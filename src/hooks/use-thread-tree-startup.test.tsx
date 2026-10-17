import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act } from 'react-test-renderer';
import { useThreadTreeController } from './use-thread-tree';

const mockRefresh = jest.fn<() => Promise<void>>();
const mockApplied = jest.fn();
const mockBegin = jest.fn();
const mockSyncSelection = jest.fn();
const mockActivateComposer = jest.fn();
let mockGateway = {
    connectionId: 1,
    sessionConnectionGeneration: 1,
    connectionState: 'Connected',
    connectionGatewayId: 'gateway',
};
let mockWorkspace = { activeWorkspaceId: 'workspace' };
let mockPublication = {
    snapshot: { workspace_id: 'workspace', threads_by_id: {} },
    loading: false,
    error: null as string | null,
};
jest.mock('@/services/threads/tree', () => ({ refreshThreadTree: () => mockRefresh() }));
jest.mock('@/client/workspaces', () => ({ directorySnapshot: () => mockPublication }));
jest.mock('@/stores/gateway', () => ({
    useGatewayStore: Object.assign(
        (selector: (state: typeof mockGateway) => unknown) => selector(mockGateway),
        { getState: () => mockGateway },
    ),
}));
jest.mock('@/stores/workspace', () => ({
    useWorkspaceStore: Object.assign(
        (selector: (state: typeof mockWorkspace) => unknown) => selector(mockWorkspace),
        { getState: () => mockWorkspace },
    ),
}));
jest.mock('@/stores/active-thread', () => ({
    useActiveThreadStore: {
        getState: () => ({
            syncComposerModelSelection: mockSyncSelection,
            activateComposerThread: mockActivateComposer,
        }),
    },
}));
jest.mock('@/stores/thread-tree', () => ({ useThreadTreeStore: {} }));
jest.mock('@/services/telemetry/mobile-startup-tree', () => ({
    recordStartupTreeApplied: (...args: unknown[]) => mockApplied(...args),
}));
jest.mock('@/services/telemetry/mobile-startup', () => ({
    mobileStartup: {
        begin: (...args: unknown[]) => mockBegin(...args),
        succeed: () => {},
        fail: () => {},
    },
}));
const Harness = () => {
    useThreadTreeController();
    return null;
};

beforeEach(() => {
    jest.clearAllMocks();
    mockGateway = {
        connectionId: 1,
        sessionConnectionGeneration: 1,
        connectionState: 'Connected',
        connectionGatewayId: 'gateway',
    };
    mockWorkspace = { activeWorkspaceId: 'workspace' };
    mockPublication = {
        snapshot: { workspace_id: 'workspace', threads_by_id: {} },
        loading: false,
        error: null,
    };
});
describe('startup observes the existing tree request', () => {
    it('records empty-tree application only after the existing refresh and adds no composer demand', async () => {
        let resolve!: () => void;
        mockRefresh.mockImplementation(
            () =>
                new Promise<void>((done) => {
                    resolve = done;
                }),
        );
        let tree!: renderer.ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<Harness />);
        });
        expect(mockApplied).not.toHaveBeenCalled();
        await act(async () => {
            resolve();
        });
        expect(mockRefresh).toHaveBeenCalledTimes(1);
        expect(mockApplied).toHaveBeenCalledWith(
            { gatewayId: 'gateway', connectionId: 1, workspaceId: 'workspace' },
            false,
        );
        expect(mockActivateComposer).not.toHaveBeenCalled();
        expect(mockBegin.mock.calls.flat()).not.toContain('composer.prepare');
        // Preserve the pre-existing selection-sync call, without treating it as readiness.
        expect(mockSyncSelection).toHaveBeenCalledTimes(1);
        await act(async () => tree.unmount());
    });
    it('ignores a late response from an old connection', async () => {
        let resolve!: () => void;
        mockRefresh.mockImplementation(
            () =>
                new Promise<void>((done) => {
                    resolve = done;
                }),
        );
        let tree!: renderer.ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<Harness />);
        });
        mockGateway = { ...mockGateway, sessionConnectionGeneration: 2 };
        await act(async () => {
            resolve();
        });
        expect(mockApplied).not.toHaveBeenCalled();
        expect(mockRefresh).toHaveBeenCalledTimes(1);
        await act(async () => tree.unmount());
    });
});

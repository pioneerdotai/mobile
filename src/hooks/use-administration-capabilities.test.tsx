import React from 'react';
import { expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { useAuthorizationCapabilitySnapshot } from './use-administration-capabilities';
const mockListeners = new Set<() => void>();
let mockSnapshot: { payload: Record<string, unknown> } | null = null;
const mockStore = {
    getSnapshot: () => mockSnapshot,
    subscribe: (callback: () => void) => {
        mockListeners.add(callback);
        return () => {
            mockListeners.delete(callback);
        };
    },
};
const mockRefresh = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock('@/client', () => ({
    mobileClientBinding: { scope: () => mockStore, synchronize: async () => undefined },
    pioneerClient: {
        gatewayAuthorizationCapabilities: (...args: unknown[]) => mockRefresh(...args),
        gatewayAuthMe: (...args: unknown[]) => mockRefresh(...args),
        principalPresentationCapabilities: (value: unknown) => value,
        currentPrincipalPresentation: (value: unknown) => value,
    },
}));
jest.mock('@/stores/workspace', () => ({
    useWorkspaceStore: (selector: (state: { activeWorkspaceId: string }) => unknown) =>
        selector({ activeWorkspaceId: 'workspace' }),
}));
const publish = (payload: Record<string, unknown>) => {
    mockSnapshot = { payload };
    for (const listener of mockListeners) listener();
};
it('selects only the current Client capability revision and exposes its failure instead of creating a query cache', async () => {
    let value!: ReturnType<typeof useAuthorizationCapabilitySnapshot>;
    const Probe = () => {
        value = useAuthorizationCapabilitySnapshot('thread');
        return null;
    };
    let tree!: ReactTestRenderer;
    const publication = {
        connection_id: 7,
        connection_generation: 1,
        authorization_change_sequence: 0,
        current_auth: null,
        workspace_snapshots: {},
        thread_snapshots: { thread: { authorization_revision: 9 } },
        capability_reads: [],
    };
    mockSnapshot = { payload: publication };
    await act(async () => {
        tree = renderer.create(<Probe />);
    });
    expect(value.data?.authorization_revision).toBe(9);
    expect(mockRefresh).toHaveBeenCalledWith({ workspace_id: 'workspace', thread_id: 'thread' });
    act(() =>
        publish({
            ...publication,
            thread_snapshots: {},
            capability_reads: [
                {
                    workspace_id: 'workspace',
                    thread_id: 'thread',
                    loading: false,
                    error: 'capability_request_failed',
                },
            ],
        }),
    );
    expect(value.data).toBeUndefined();
    expect(value.isError).toBe(true);
    expect(value.isPending).toBe(false);
    act(() =>
        publish({
            ...publication,
            connection_id: null,
            thread_snapshots: {},
            capability_reads: [],
        }),
    );
    expect(value.data).toBeUndefined();
    await act(async () => tree.unmount());
    expect(mockListeners.size).toBe(0);
});

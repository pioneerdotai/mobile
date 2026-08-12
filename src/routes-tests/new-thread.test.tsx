import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockReact = React;
const mockPlan = jest.fn();
const mockOpen = jest.fn<() => Promise<Record<string, unknown>>>();
const mockCache = jest.fn();
const mockQueryClient = {};
const mockTranslate = (key: string) => key;
const mockPush = jest.fn();
let mockCapabilitySnapshot: Record<string, unknown>;

jest.mock('@tanstack/react-query', () => ({
    useQueryClient: () => mockQueryClient,
}));
jest.mock('expo-router/js-stack', () => ({
    __esModule: true,
    default: {
        Screen: (props: Record<string, unknown>) => mockReact.createElement('Screen', props),
    },
}));
jest.mock('expo-router', () => ({
    router: { push: mockPush },
}));
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: mockTranslate }),
}));
jest.mock('react-native-unistyles', () => ({
    StyleSheet: {
        create: () =>
            new Proxy(
                {},
                {
                    get: () => ({}),
                },
            ),
    },
}));
jest.mock('@/client', () => ({
    pioneerClient: { threadCreateVisibilityPlan: mockPlan },
}));
jest.mock('@/components/buttons/base', () => ({
    Button: (props: Record<string, unknown>) => mockReact.createElement('Button', props),
}));
jest.mock('@/components/overlays/thread-actions', () => ({
    ThreadActionsSheet: (props: Record<string, unknown>) =>
        mockReact.createElement('ThreadActionsSheet', props),
}));
jest.mock('@/hooks/use-administration-capabilities', () => ({
    useAuthorizationCapabilitySnapshot: () => mockCapabilitySnapshot,
}));
jest.mock('@/screens/thread', () => ({
    __esModule: true,
    default: (props: Record<string, unknown>) => mockReact.createElement('ThreadScreen', props),
}));
jest.mock('@/screens/thread/hooks', () => ({
    useThreadScreen: () => ({ options: {} }),
}));
jest.mock('@/services/threads/active', () => ({
    openOrCreateNewThread: mockOpen,
}));
jest.mock('@/services/threads/timeline-query', () => ({
    cacheActiveThreadSnapshot: mockCache,
}));
jest.mock('@/stores/active-thread', () => ({
    useActiveThreadStore: { getState: () => ({ expandedKeys: [] }) },
}));
jest.mock('@/stores/gateway', () => {
    const state = { connectionId: 7, connectionState: 'Connected' };
    const useGatewayStore = (selector: (value: typeof state) => unknown) => selector(state);
    useGatewayStore.getState = () => state;
    return { useGatewayStore };
});
jest.mock('@/stores/workspace', () => {
    const state = { activeWorkspaceId: 'workspace-a', error: null };
    const useWorkspaceStore = (selector: (value: typeof state) => unknown) => selector(state);
    useWorkspaceStore.getState = () => state;
    return { useWorkspaceStore };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NewThreadRoute = require('@/routes/thread/new')
    .default as typeof import('@/routes/thread/new').default;

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
};

const renderRoute = async (): Promise<ReactTestRenderer> => {
    let tree: ReactTestRenderer | null = null;
    await act(async () => {
        tree = renderer.create(<NewThreadRoute />);
        await flush();
    });
    return tree!;
};

describe('new collaborative thread route', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCapabilitySnapshot = {
            data: {
                schema_version: 1,
                authorization_revision: 1,
                principal_id: 'member-a',
                role_key: 'member',
                workspace: { capabilities: { can_create_thread: true } },
            },
            isPending: false,
            isError: false,
        };
        mockOpen.mockResolvedValue({
            thread_id: 'thread-a',
            thread: { id: 'thread-a', workspace_id: 'workspace-a' },
            projection: { revision: 1 },
        });
    });

    it('creates a Member thread immediately with the shared private default', async () => {
        mockPlan.mockReturnValue({ default_visibility: 'private', options: ['private'] });
        const tree = await renderRoute();

        expect(mockOpen).toHaveBeenCalledWith({
            workspace_id: 'workspace-a',
            visibility: 'private',
            expanded_keys: [],
        });
        expect(tree.root.find((node) => String(node.type) === 'ThreadScreen').props.threadId).toBe(
            'thread-a',
        );
    });

    it('creates a Superuser thread immediately with the private default', async () => {
        mockCapabilitySnapshot = {
            data: {
                schema_version: 1,
                authorization_revision: 2,
                principal_id: 'superuser-a',
                role_key: 'superuser',
                workspace: { capabilities: { can_create_thread: true } },
            },
            isPending: false,
            isError: false,
        };
        mockPlan.mockReturnValue({
            default_visibility: 'private',
            options: ['private', 'workspace'],
        });
        const tree = await renderRoute();
        expect(mockOpen).toHaveBeenCalledWith({
            workspace_id: 'workspace-a',
            visibility: 'private',
            expanded_keys: [],
        });
        expect(tree.root.find((node) => String(node.type) === 'ThreadScreen').props.threadId).toBe(
            'thread-a',
        );
    });

    it('keeps the created thread mounted when the authorization revision advances', async () => {
        mockPlan.mockReturnValue({ default_visibility: 'private', options: ['private'] });
        const tree = await renderRoute();

        mockCapabilitySnapshot = {
            ...mockCapabilitySnapshot,
            data: {
                ...(mockCapabilitySnapshot.data as Record<string, unknown>),
                authorization_revision: 2,
            },
        };
        await act(async () => {
            tree.update(<NewThreadRoute />);
            await flush();
        });

        expect(mockOpen).toHaveBeenCalledTimes(1);
        expect(tree.root.find((node) => String(node.type) === 'ThreadScreen').props.threadId).toBe(
            'thread-a',
        );
    });

    it('fails closed when shared visibility planning is unavailable', async () => {
        mockPlan.mockImplementation(() => {
            throw new Error('unsupported principal');
        });
        const tree = await renderRoute();

        expect(mockOpen).not.toHaveBeenCalled();
        expect(JSON.stringify(tree.toJSON())).toContain('createThreadFailed');
    });
});

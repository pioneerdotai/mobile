/* eslint-disable import/first */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';

jest.mock('@/services/threads/active', () => ({
    applyActiveThreadEvent: jest.fn(),
}));

jest.mock('@/client', () => ({
    PioneerClientNativeError: class PioneerClientNativeError extends Error {
        code: string | null;

        constructor(message: string, code: string | null = null) {
            super(message);
            this.code = code;
        }
    },
    pioneerClient: {
        composerDomainTransition: jest.fn(
            ({ state, action }: { state: unknown; action: { Reset?: { defaults: unknown } } }) => ({
                state: action.Reset?.defaults ?? state,
            }),
        ),
        composerDraftLifecycleTransition: jest.fn(() => ({
            state: { drafts: {} },
        })),
    },
}));

jest.mock('@/services/gateway/registry', () => ({
    defaultGatewayRegistry: () => ({
        active_gateway_id: null,
        installation_id: 'installation-test',
        local: null,
        remotes: [],
        version: 3,
    }),
}));

import type { ClientActiveThreadEventResult, Workspace } from '@/client';
import {
    applyMobileAccessChangedLifecycle,
    beginMobileAuthorizationEpoch,
    failClosedMobileAccessChange,
} from '@/services/gateway/access-change';
import { timelineQueryKeys } from '@/services/threads/timeline-query';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useGatewayStore } from '@/stores/gateway';
import { useThreadTreeStore } from '@/stores/thread-tree';
import { useWorkspaceStore } from '@/stores/workspace';

type AccessChangedLifecycle = NonNullable<ClientActiveThreadEventResult['access_changed']>;

const workspace = (id: string): Workspace => ({
    id,
    name: `${id} name`,
    is_active: true,
    is_current: false,
    created_at: 1,
    updated_at: 2,
});

const lifecycle = (overrides: Partial<AccessChangedLifecycle> = {}): AccessChangedLifecycle => ({
    active_scope_cleared: true,
    active_thread_cleared: true,
    applied: true,
    authorization_revision: 7,
    change: 'workspace_membership',
    refresh_workspace_catalog: true,
    workspace_id: 'workspace-protected',
    ...overrides,
});

const createQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {
                gcTime: Number.POSITIVE_INFINITY,
            },
        },
    });

describe('mobile access-change lifecycle', () => {
    beforeEach(() => {
        useActiveThreadStore.getState().reset();
        useActiveThreadStore.getState().resetDefaultComposerModelSelection();
        useThreadTreeStore.getState().reset();
        useWorkspaceStore.getState().resetConnectionBootstrap();
    });

    it('clears inaccessible projections without logging out or changing registry', () => {
        const queryClient = createQueryClient();
        const registry = useGatewayStore.getState().registry;
        useGatewayStore.setState({
            registry,
            sessionId: 'session-kept',
            sessionDeviceId: 'device-kept',
            sessionAccessExpiresAtUnix: 1234,
        });
        useWorkspaceStore.setState({
            workspaces: [workspace('workspace-protected'), workspace('workspace-kept')],
            activeWorkspaceId: 'workspace-protected',
            preferredWorkspaceId: 'workspace-protected',
            bootstrappedConnectionId: 42,
        });
        useThreadTreeStore.setState({
            snapshot: {
                workspace_id: 'workspace-protected',
                threads_by_id: { protected: { preview: 'secret' } },
            } as never,
            workspaceId: 'workspace-protected',
        });
        useActiveThreadStore.setState({
            activeComposerThreadId: 'thread-protected',
            composerAttachments: [{ name: 'protected.txt' }] as never,
        });
        queryClient.setQueryData(timelineQueryKeys.threadSnapshot('thread-protected'), {
            workspace_id: 'workspace-protected',
            thread_id: 'thread-protected',
        });
        queryClient.setQueryData(
            timelineQueryKeys.thread('thread-protected'),
            'protected timeline',
        );
        queryClient.setQueryData(timelineQueryKeys.thread('thread-kept'), 'unrelated timeline');

        applyMobileAccessChangedLifecycle(lifecycle(), queryClient);

        expect(useWorkspaceStore.getState()).toMatchObject({
            activeWorkspaceId: null,
            preferredWorkspaceId: null,
            bootstrappedConnectionId: null,
        });
        expect(useWorkspaceStore.getState().workspaces.map(({ id }) => id)).toEqual([
            'workspace-kept',
        ]);
        expect(useThreadTreeStore.getState().snapshot).toBeNull();
        expect(useActiveThreadStore.getState().activeComposerThreadId).toBeNull();
        expect(useActiveThreadStore.getState().composerAttachments).toEqual([]);
        expect(
            queryClient.getQueryData(timelineQueryKeys.threadSnapshot('thread-protected')),
        ).toBeUndefined();
        expect(queryClient.getQueriesData({ queryKey: timelineQueryKeys.all })).toEqual([]);

        const gateway = useGatewayStore.getState();
        expect(gateway.registry).toBe(registry);
        expect(gateway.sessionId).toBe('session-kept');
        expect(gateway.sessionDeviceId).toBe('device-kept');
        expect(gateway.sessionAccessExpiresAtUnix).toBe(1234);
    });

    it('clears a selected revoked workspace even when native has no active thread scope', () => {
        const queryClient = createQueryClient();
        useWorkspaceStore.setState({
            workspaces: [workspace('workspace-protected'), workspace('workspace-kept')],
            activeWorkspaceId: 'workspace-protected',
            preferredWorkspaceId: 'workspace-protected',
            bootstrappedConnectionId: 17,
        });

        applyMobileAccessChangedLifecycle(
            lifecycle({
                active_scope_cleared: false,
                active_thread_cleared: false,
            }),
            queryClient,
        );

        expect(useWorkspaceStore.getState()).toMatchObject({
            activeWorkspaceId: null,
            preferredWorkspaceId: null,
            bootstrappedConnectionId: null,
        });
        expect(useWorkspaceStore.getState().workspaces.map(({ id }) => id)).toEqual([
            'workspace-kept',
        ]);
    });

    it('stale/no-op lifecycle preserves current Superuser projections', () => {
        const queryClient = createQueryClient();
        useWorkspaceStore.setState({
            workspaces: [workspace('workspace-protected')],
            activeWorkspaceId: 'workspace-protected',
            preferredWorkspaceId: 'workspace-protected',
            bootstrappedConnectionId: 12,
        });
        queryClient.setQueryData(
            timelineQueryKeys.thread('thread-superuser'),
            'superuser timeline',
        );

        applyMobileAccessChangedLifecycle(
            lifecycle({
                applied: false,
                active_scope_cleared: false,
                active_thread_cleared: false,
            }),
            queryClient,
        );

        expect(useWorkspaceStore.getState()).toMatchObject({
            activeWorkspaceId: 'workspace-protected',
            preferredWorkspaceId: 'workspace-protected',
            bootstrappedConnectionId: 12,
        });
        expect(queryClient.getQueryData(timelineQueryKeys.thread('thread-superuser'))).toBe(
            'superuser timeline',
        );
    });

    it('thread access loss clears protected thread state but keeps workspace access', () => {
        const queryClient = createQueryClient();
        useWorkspaceStore.setState({
            workspaces: [workspace('workspace-protected'), workspace('workspace-kept')],
            activeWorkspaceId: 'workspace-protected',
            preferredWorkspaceId: 'workspace-protected',
            bootstrappedConnectionId: 15,
        });
        useThreadTreeStore.setState({
            snapshot: {
                workspace_id: 'workspace-protected',
                threads_by_id: { protected: { preview: 'secret' } },
            } as never,
            workspaceId: 'workspace-protected',
        });
        useActiveThreadStore.setState({
            activeComposerThreadId: 'thread-protected',
            composerAttachments: [{ name: 'protected.txt' }] as never,
        });
        queryClient.setQueryData(timelineQueryKeys.threadSnapshot('thread-protected'), {
            workspace_id: 'workspace-protected',
            thread_id: 'thread-protected',
        });
        queryClient.setQueryData(
            timelineQueryKeys.thread('thread-protected'),
            'protected timeline',
        );
        queryClient.setQueryData(timelineQueryKeys.thread('thread-kept'), 'accessible timeline');

        applyMobileAccessChangedLifecycle(
            lifecycle({
                change: 'thread_participant_removed',
                active_scope_cleared: false,
                active_thread_cleared: true,
            }),
            queryClient,
            ['thread-protected'],
        );

        expect(useWorkspaceStore.getState()).toMatchObject({
            activeWorkspaceId: 'workspace-protected',
            preferredWorkspaceId: 'workspace-protected',
            bootstrappedConnectionId: null,
        });
        expect(useWorkspaceStore.getState().workspaces.map(({ id }) => id)).toEqual([
            'workspace-protected',
            'workspace-kept',
        ]);
        expect(useThreadTreeStore.getState().snapshot).toBeNull();
        expect(useActiveThreadStore.getState().activeComposerThreadId).toBeNull();
        expect(useActiveThreadStore.getState().composerAttachments).toEqual([]);
        expect(
            queryClient.getQueryData(timelineQueryKeys.threadSnapshot('thread-protected')),
        ).toBeUndefined();
        expect(
            queryClient.getQueryData(timelineQueryKeys.thread('thread-protected')),
        ).toBeUndefined();
        expect(queryClient.getQueryData(timelineQueryKeys.thread('thread-kept'))).toBe(
            'accessible timeline',
        );
    });

    it('legacy thread access loss without an exact eviction key fails closed', () => {
        const queryClient = createQueryClient();
        queryClient.setQueryData(
            timelineQueryKeys.thread('thread-protected'),
            'protected timeline',
        );
        queryClient.setQueryData(
            timelineQueryKeys.thread('thread-unknown-scope'),
            'potentially protected timeline',
        );

        applyMobileAccessChangedLifecycle(
            lifecycle({
                change: 'thread_participant_removed',
                active_scope_cleared: false,
                active_thread_cleared: false,
            }),
            queryClient,
        );

        expect(queryClient.getQueriesData({ queryKey: timelineQueryKeys.all })).toEqual([]);
    });

    it('native reduction failure still evicts the affected active scope', () => {
        const queryClient = createQueryClient();
        useWorkspaceStore.setState({
            workspaces: [workspace('workspace-protected')],
            activeWorkspaceId: 'workspace-protected',
            preferredWorkspaceId: 'workspace-protected',
            bootstrappedConnectionId: 9,
        });
        queryClient.setQueryData(
            timelineQueryKeys.thread('thread-protected'),
            'protected timeline',
        );

        failClosedMobileAccessChange('workspace-protected', queryClient);

        expect(useWorkspaceStore.getState().activeWorkspaceId).toBeNull();
        expect(useWorkspaceStore.getState().workspaces).toEqual([]);
        expect(queryClient.getQueriesData({ queryKey: timelineQueryKeys.all })).toEqual([]);
    });

    it('reconnect begins with empty protected cache and preserves endpoint session state', () => {
        const queryClient = createQueryClient();
        const registry = useGatewayStore.getState().registry;
        useGatewayStore.setState({
            registry,
            sessionId: 'session-kept',
            sessionDeviceId: 'device-kept',
            sessionAccessExpiresAtUnix: 5678,
        });
        useWorkspaceStore.setState({
            workspaces: [workspace('workspace-protected')],
            activeWorkspaceId: 'workspace-protected',
            preferredWorkspaceId: 'workspace-protected',
            bootstrappedConnectionId: 22,
        });
        useThreadTreeStore.setState({
            snapshot: {
                workspace_id: 'workspace-protected',
                threads_by_id: { protected: { preview: 'secret' } },
            } as never,
            workspaceId: 'workspace-protected',
        });
        useActiveThreadStore.setState({
            activeComposerThreadId: 'thread-protected',
            composerAttachments: [{ name: 'protected.txt' }] as never,
        });
        queryClient.setQueryData(timelineQueryKeys.threadSnapshot('thread-protected'), {
            workspace_id: 'workspace-protected',
            thread_id: 'thread-protected',
        });
        queryClient.setQueryData(
            timelineQueryKeys.thread('thread-protected'),
            'protected timeline',
        );

        beginMobileAuthorizationEpoch(queryClient);

        expect(useWorkspaceStore.getState()).toMatchObject({
            workspaces: [],
            activeWorkspaceId: null,
            preferredWorkspaceId: null,
            bootstrappedConnectionId: null,
        });
        expect(useThreadTreeStore.getState().snapshot).toBeNull();
        expect(useActiveThreadStore.getState().activeComposerThreadId).toBeNull();
        expect(useActiveThreadStore.getState().composerAttachments).toEqual([]);
        expect(
            queryClient.getQueryData(timelineQueryKeys.threadSnapshot('thread-protected')),
        ).toBeUndefined();
        expect(queryClient.getQueriesData({ queryKey: timelineQueryKeys.all })).toEqual([]);
        const gateway = useGatewayStore.getState();
        expect(gateway.registry).toBe(registry);
        expect(gateway.sessionId).toBe('session-kept');
        expect(gateway.sessionDeviceId).toBe('device-kept');
        expect(gateway.sessionAccessExpiresAtUnix).toBe(5678);
    });
});

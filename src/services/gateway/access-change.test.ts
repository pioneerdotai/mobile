/* eslint-disable import/first */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';

jest.mock('@/client/navigation', () => {
    let workspaceId: string | null = null;
    return {
        installPublication: (value: string | null) => {
            workspaceId = value;
        },
        navigationSnapshot: () => ({ workspace_id: workspaceId }),
        useClientNavigation: () => ({ workspace_id: workspaceId }),
        selectWorkspace: (value: string | null) => {
            workspaceId = value;
        },
    };
});

jest.mock('@/client/workspaces', () => {
    let catalog: unknown = { workspaces: [], loading: false, action_pending: false, revision: 0 };
    let directory: unknown = null;
    return {
        installCatalog: (workspaces: unknown) => {
            catalog = { workspaces, loading: false, action_pending: false, revision: 1 };
        },
        installDirectory: (publication: unknown) => {
            directory = publication;
        },
        catalogSnapshot: () => catalog,
        useWorkspaceCatalog: () => catalog,
        directorySnapshot: (workspace: string | null) => (workspace ? directory : null),
        useWorkspaceDirectory: () => directory,
    };
});

jest.mock('@/services/threads/active', () => ({
    applyActiveThreadEvent: jest.fn(),
}));

jest.mock('@/client/composer', () => {
    let publication: unknown = null;
    return {
        install: (value: unknown) => {
            publication = value;
        },
        composerSnapshot: () => publication,
        useComposerPublication: () => publication,
        dispatchComposer: jest.fn((intent: { kind: string }) => {
            if (intent.kind === 'clear_all') publication = null;
        }),
    };
});

jest.mock('@/client', () => ({
    PioneerClientNativeError: class PioneerClientNativeError extends Error {
        code: string | null;

        constructor(message: string, code: string | null = null) {
            super(message);
            this.code = code;
        }
    },
    pioneerClient: {
        authorizationAccessChangePlan: jest.fn(),
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
import { pioneerClient } from '@/client';
import type { IdentityAuthorizationPublication } from '@/client/generated/identity_authorization_publication';
import {
    applyMobileAccessChangedEvent,
    applyPublishedMobileAccessProjection,
    applyMobileAccessChangedLifecycle,
    beginMobileAuthorizationEpoch,
    revalidateMobileAuthorizationProjections,
    failClosedMobileAccessChange,
    providerAccessChangedWorkspaceId,
} from '@/services/gateway/access-change';
import { applyActiveThreadEvent } from '@/services/threads/active';
import { timelineQueryKeys } from '@/services/threads/timeline-query';
import { threadScopeQueryKeys } from '@/services/threads/scope';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useGatewayStore } from '@/stores/gateway';
import { useThreadTreeStore } from '@/stores/thread-tree';
import { useWorkspaceStore } from '@/stores/workspace';

// These immutable outputs are installed by Client before the shell receives
// the access lifecycle; the Mobile cleanup never edits the catalog/directory.
const installCatalogPublication = (workspaces: Workspace[]) => {
    (
        jest.requireMock('@/client/workspaces') as { installCatalog: (rows: Workspace[]) => void }
    ).installCatalog(workspaces);
};
const installDirectoryPublication = (value: { snapshot: unknown; workspaceId?: string } | null) => {
    (
        jest.requireMock('@/client/workspaces') as { installDirectory: (value: unknown) => void }
    ).installDirectory(
        value
            ? {
                  snapshot: value.snapshot,
                  revision: 1,
                  loading: false,
                  error: null,
                  changes: { changed: [], removed: [], reordered_folders: [] },
              }
            : null,
    );
};

const mockApplyActiveThreadEvent = jest.mocked(applyActiveThreadEvent);

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
    it('clears stale policy data while preserving the active editing scope', () => {
        const queryClient = createQueryClient();
        useWorkspaceStore.setState({ activeWorkspaceId: 'workspace-kept' });
        useActiveThreadStore.getState().activateComposerThread('thread-kept');
        const timeline = timelineQueryKeys.threadSnapshot('thread-kept');
        const capabilities = threadScopeQueryKeys.detail('thread-kept');
        queryClient.setQueryData(timeline, { content: 'old server data' });
        queryClient.setQueryData(capabilities, { canManage: true });
        revalidateMobileAuthorizationProjections(queryClient);
        expect(queryClient.getQueryData(timeline)).toBeUndefined();
        expect(queryClient.getQueryData(capabilities)).toBeUndefined();
        expect(useActiveThreadStore.getState().activeComposerThreadId).toBe('thread-kept');
        expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('workspace-kept');
        queryClient.clear();
    });

    beforeEach(() => {
        mockApplyActiveThreadEvent.mockReset();
        useActiveThreadStore.getState().reset();
        installDirectoryPublication(null);
        installCatalogPublication([]);
        useWorkspaceStore.getState().resetConnectionBootstrap();
    });

    it('applies the Client cleanup plan synchronously without waiting for native thread delivery', () => {
        const queryClient = createQueryClient();
        useWorkspaceStore.setState({ activeWorkspaceId: 'workspace-protected' });
        useActiveThreadStore.getState().activateComposerThread('thread-protected');
        const timeline = timelineQueryKeys.threadSnapshot('thread-protected');
        queryClient.setQueryData(timeline, { secret: 'protected data' });
        jest.mocked(pioneerClient.authorizationAccessChangePlan).mockReturnValue({
            authorization_revision: 7,
            workspace_id: 'workspace-protected',
            change: 'thread_participant_removed',
            apply: true,
            invalidate_thread_ids: ['thread-protected'],
            clear_active_workspace: false,
            clear_active_thread: true,
            clear_workspace_capability_projections: false,
            effects: [],
        });
        const publication = {
            connection_generation: 3,
            authorization_change_sequence: 4,
            access_change: {
                authorization_revision: 7,
                workspace_id: 'workspace-protected',
                thread_id: 'thread-protected',
                change: 'thread_participant_removed',
                outcome: 'revoked',
            },
        } as IdentityAuthorizationPublication;
        applyPublishedMobileAccessProjection(publication, queryClient);
        expect(queryClient.getQueryData(timeline)).toBeUndefined();
        expect(useActiveThreadStore.getState().activeComposerThreadId).toBeNull();
        expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('workspace-protected');
        expect(mockApplyActiveThreadEvent).not.toHaveBeenCalled();
        expect(pioneerClient.authorizationAccessChangePlan).toHaveBeenCalledWith(
            expect.objectContaining({ connection_generation: 3, change_sequence: 4 }),
        );
        queryClient.clear();
    });

    it('invalidates provider snapshots only for workspace membership changes', () => {
        const event = (change: 'workspace_membership' | 'thread_visibility') => ({
            GatewayNotification: {
                kind: 'access_changed' as const,
                params: {
                    authorization_revision: 7,
                    workspace_id: 'workspace-protected',
                    thread_id: change === 'thread_visibility' ? 'thread-protected' : null,
                    change,
                    outcome: 'retained' as const,
                },
            },
        });

        expect(providerAccessChangedWorkspaceId(event('workspace_membership'))).toBe(
            'workspace-protected',
        );
        expect(providerAccessChangedWorkspaceId(event('thread_visibility'))).toBeNull();
    });

    it('preserves an open thread and tree when visibility changes without access loss', async () => {
        useWorkspaceStore.setState({ activeWorkspaceId: 'workspace-protected' });
        const queryClient = createQueryClient();
        const snapshot = {
            thread_id: 'thread-protected',
            workspace_id: 'workspace-protected',
            projection: { revision: 8 },
        } as never;
        const membersQueryKey = [...threadScopeQueryKeys.detail('thread-protected'), 12] as const;
        useActiveThreadStore.getState().activateComposerThread('thread-protected');
        useActiveThreadStore.getState().setExpandedKeys(['turn:expanded']);
        installDirectoryPublication({
            snapshot: {
                workspace_id: 'workspace-protected',
                threads_by_id: { 'thread-protected': { id: 'thread-protected' } },
            } as never,
            workspaceId: 'workspace-protected',
        });
        queryClient.setQueryData(timelineQueryKeys.threadSnapshot('thread-protected'), snapshot);
        queryClient.setQueryData(membersQueryKey, { participants: [] });
        mockApplyActiveThreadEvent.mockResolvedValue({
            access_changed: lifecycle({
                change: 'thread_visibility',
                active_scope_cleared: false,
                active_thread_cleared: false,
                refresh_workspace_catalog: false,
            }),
            administration_refetch: [],
            semantic_timeline_patch: {} as never,
            snapshot: { thread_id: null } as never,
        });
        await applyMobileAccessChangedEvent(
            {
                GatewayNotification: {
                    kind: 'access_changed',
                    params: {
                        authorization_revision: 7,
                        workspace_id: 'workspace-protected',
                        thread_id: 'thread-protected',
                        change: 'thread_visibility',
                        outcome: 'retained',
                    },
                },
            },
            queryClient,
        );

        expect(queryClient.getQueryData(timelineQueryKeys.threadSnapshot('thread-protected'))).toBe(
            snapshot,
        );
        expect(useActiveThreadStore.getState().activeComposerThreadId).toBe('thread-protected');
        expect(
            useThreadTreeStore.getState().snapshot?.threads_by_id['thread-protected'],
        ).toBeTruthy();
        expect(queryClient.getQueryState(membersQueryKey)?.isInvalidated).toBe(true);
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
        installCatalogPublication([workspace('workspace-protected'), workspace('workspace-kept')]);
        useWorkspaceStore.setState({
            activeWorkspaceId: 'workspace-protected',
            preferredWorkspaceId: 'workspace-protected',
            bootstrappedConnectionId: 42,
        });
        installDirectoryPublication({
            snapshot: {
                workspace_id: 'workspace-protected',
                threads_by_id: {
                    'thread-protected': { id: 'thread-protected', preview: 'secret' },
                    'thread-kept': { id: 'thread-kept', preview: 'kept' },
                },
                placements_by_thread_id: {},
                thread_ids_by_folder_id: {
                    __root__: ['thread-protected', 'thread-kept'],
                },
                unread: [],
            } as never,
            workspaceId: 'workspace-protected',
        });
        (jest.requireMock('@/client/composer') as { install: (value: unknown) => void }).install({
            thread_id: 'thread-protected',
            draft_id: 1,
            revision: 1,
            draft: {
                text: '',
                domain: {
                    capability_target: {
                        kind: 'native',
                        supports_skills: true,
                        supports_mcp_tools: true,
                    },
                    attachments: [
                        {
                            path: '/synthetic/protected.txt',
                            file_name: 'protected.txt',
                            kind: 'File',
                            upload_state: 'Local',
                        },
                    ],
                },
            },
        });
        useActiveThreadStore.getState().activateComposerThread('thread-protected');
        expect(useActiveThreadStore.getState().composerAttachments).toHaveLength(1);
        queryClient.setQueryData(timelineQueryKeys.threadSnapshot('thread-protected'), {
            workspace_id: 'workspace-protected',
            thread_id: 'thread-protected',
        });
        queryClient.setQueryData(
            timelineQueryKeys.thread('thread-protected'),
            'protected timeline',
        );
        queryClient.setQueryData(timelineQueryKeys.thread('thread-kept'), 'unrelated timeline');

        // The Client fence installs selection before delivering the cleanup lifecycle.
        (
            jest.requireMock('@/client/navigation') as {
                installPublication: (id: string | null) => void;
            }
        ).installPublication(null);
        installCatalogPublication([workspace('workspace-kept')]);
        installDirectoryPublication(null);
        applyMobileAccessChangedLifecycle(lifecycle(), queryClient, [], 'revoked');

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
        installCatalogPublication([workspace('workspace-protected'), workspace('workspace-kept')]);
        useWorkspaceStore.setState({
            activeWorkspaceId: 'workspace-protected',
            preferredWorkspaceId: 'workspace-protected',
            bootstrappedConnectionId: 17,
        });

        (
            jest.requireMock('@/client/navigation') as {
                installPublication: (id: string | null) => void;
            }
        ).installPublication(null);
        installCatalogPublication([workspace('workspace-kept')]);
        installDirectoryPublication(null);
        applyMobileAccessChangedLifecycle(
            lifecycle({
                active_scope_cleared: true,
                active_thread_cleared: false,
            }),
            queryClient,
            [],
            'revoked',
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
        installCatalogPublication([workspace('workspace-protected')]);
        useWorkspaceStore.setState({
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
            [],
            'retained',
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
        installCatalogPublication([workspace('workspace-protected'), workspace('workspace-kept')]);
        useWorkspaceStore.setState({
            activeWorkspaceId: 'workspace-protected',
            preferredWorkspaceId: 'workspace-protected',
            bootstrappedConnectionId: 15,
        });
        installDirectoryPublication({
            snapshot: {
                workspace_id: 'workspace-protected',
                threads_by_id: {
                    'thread-protected': { id: 'thread-protected', preview: 'secret' },
                    'thread-kept': { id: 'thread-kept', preview: 'kept' },
                },
                placements_by_thread_id: {},
                thread_ids_by_folder_id: {
                    __root__: ['thread-protected', 'thread-kept'],
                },
                unread: [],
            } as never,
            workspaceId: 'workspace-protected',
        });
        (jest.requireMock('@/client/composer') as { install: (value: unknown) => void }).install({
            thread_id: 'thread-protected',
            draft_id: 1,
            revision: 1,
            draft: {
                text: '',
                domain: {
                    capability_target: {
                        kind: 'native',
                        supports_skills: true,
                        supports_mcp_tools: true,
                    },
                    attachments: [
                        {
                            path: '/synthetic/protected.txt',
                            file_name: 'protected.txt',
                            kind: 'File',
                            upload_state: 'Local',
                        },
                    ],
                },
            },
        });
        useActiveThreadStore.getState().activateComposerThread('thread-protected');
        expect(useActiveThreadStore.getState().composerAttachments).toHaveLength(1);
        queryClient.setQueryData(timelineQueryKeys.threadSnapshot('thread-protected'), {
            workspace_id: 'workspace-protected',
            thread_id: 'thread-protected',
        });
        queryClient.setQueryData(
            timelineQueryKeys.thread('thread-protected'),
            'protected timeline',
        );
        queryClient.setQueryData(timelineQueryKeys.thread('thread-kept'), 'accessible timeline');

        installDirectoryPublication({
            snapshot: {
                workspace_id: 'workspace-protected',
                threads_by_id: { 'thread-kept': { id: 'thread-kept', preview: 'kept' } },
            },
        });
        applyMobileAccessChangedLifecycle(
            lifecycle({
                change: 'thread_participant_removed',
                active_scope_cleared: false,
                active_thread_cleared: true,
                refresh_workspace_catalog: false,
            }),
            queryClient,
            ['thread-protected'],
            'revoked',
        );

        expect(useWorkspaceStore.getState()).toMatchObject({
            activeWorkspaceId: 'workspace-protected',
            preferredWorkspaceId: 'workspace-protected',
            bootstrappedConnectionId: 15,
        });
        expect(useWorkspaceStore.getState().workspaces.map(({ id }) => id)).toEqual([
            'workspace-protected',
            'workspace-kept',
        ]);
        expect(useThreadTreeStore.getState().snapshot?.threads_by_id).toEqual({
            'thread-kept': { id: 'thread-kept', preview: 'kept' },
        });
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

    it('malformed revoked thread notification without an exact key fails closed', () => {
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
            [],
            'revoked',
        );

        expect(queryClient.getQueriesData({ queryKey: timelineQueryKeys.all })).toEqual([]);
    });

    it('native reduction failure still evicts the affected active scope', () => {
        const queryClient = createQueryClient();
        installCatalogPublication([workspace('workspace-protected')]);
        useWorkspaceStore.setState({
            activeWorkspaceId: 'workspace-protected',
            preferredWorkspaceId: 'workspace-protected',
            bootstrappedConnectionId: 9,
        });
        queryClient.setQueryData(
            timelineQueryKeys.thread('thread-protected'),
            'protected timeline',
        );

        installCatalogPublication([]);
        installDirectoryPublication(null);
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
        installCatalogPublication([workspace('workspace-protected')]);
        useWorkspaceStore.setState({
            activeWorkspaceId: 'workspace-protected',
            preferredWorkspaceId: 'workspace-protected',
            bootstrappedConnectionId: 22,
        });
        installDirectoryPublication({
            snapshot: {
                workspace_id: 'workspace-protected',
                threads_by_id: { protected: { preview: 'secret' } },
            } as never,
            workspaceId: 'workspace-protected',
        });
        (jest.requireMock('@/client/composer') as { install: (value: unknown) => void }).install({
            thread_id: 'thread-protected',
            draft_id: 1,
            revision: 1,
            draft: {
                text: '',
                domain: {
                    capability_target: {
                        kind: 'native',
                        supports_skills: true,
                        supports_mcp_tools: true,
                    },
                    attachments: [
                        {
                            path: '/synthetic/protected.txt',
                            file_name: 'protected.txt',
                            kind: 'File',
                            upload_state: 'Local',
                        },
                    ],
                },
            },
        });
        useActiveThreadStore.getState().activateComposerThread('thread-protected');
        expect(useActiveThreadStore.getState().composerAttachments).toHaveLength(1);
        queryClient.setQueryData(timelineQueryKeys.threadSnapshot('thread-protected'), {
            workspace_id: 'workspace-protected',
            thread_id: 'thread-protected',
        });
        queryClient.setQueryData(
            timelineQueryKeys.thread('thread-protected'),
            'protected timeline',
        );

        installCatalogPublication([]);
        installDirectoryPublication(null);
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

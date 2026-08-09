import type { QueryClient } from '@tanstack/react-query';

import type { ClientActiveThreadEventResult, ClientEvent } from '@/client';
import {
    clearAdministrationQueries,
    invalidateAdministrationTargets,
} from '@/services/administration/query';
import { applyActiveThreadEvent } from '@/services/threads/active';
import { timelineQueryKeys } from '@/services/threads/timeline-query';
import { clearThreadScopeQueries, threadScopeQueryKeys } from '@/services/threads/scope';
import { removeThreadFromTreeSnapshot } from '@/services/threads/tree';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useThreadTreeStore } from '@/stores/thread-tree';
import { useWorkspaceStore } from '@/stores/workspace';

type AccessChangedLifecycle = NonNullable<ClientActiveThreadEventResult['access_changed']>;

const clearProtectedMobileProjections = (queryClient: QueryClient) => {
    useThreadTreeStore.getState().reset();
    useActiveThreadStore.getState().reset();
    useActiveThreadStore.getState().resetDefaultComposerModelSelection();
    void queryClient.cancelQueries({ queryKey: timelineQueryKeys.all });
    queryClient.removeQueries({ queryKey: timelineQueryKeys.all });
    clearThreadScopeQueries(queryClient);
    void clearAdministrationQueries(queryClient);
};

export const accessChangedWorkspaceId = (event: ClientEvent): string | null => {
    if (!('GatewayNotification' in event)) {
        return null;
    }
    const notification = event.GatewayNotification;
    return notification.kind === 'access_changed' ? notification.params.workspace_id : null;
};

const accessChangedThreadIds = (event: ClientEvent): readonly string[] => {
    if (!('GatewayNotification' in event)) {
        return [];
    }
    const notification = event.GatewayNotification;
    if (notification.kind !== 'access_changed') {
        return [];
    }
    const threadId = notification.params.thread_id?.trim();
    return threadId ? [threadId] : [];
};

const accessChangedAccessLost = (event: ClientEvent): boolean | null => {
    if (!('GatewayNotification' in event)) return null;
    const notification = event.GatewayNotification;
    return notification.kind === 'access_changed'
        ? (notification.params.access_lost ?? null)
        : null;
};

export const applyMobileAccessChangedLifecycle = (
    lifecycle: AccessChangedLifecycle,
    queryClient: QueryClient,
    invalidatedThreadIds: readonly string[] = [],
    accessLost: boolean | null = null,
) => {
    if (!lifecycle.applied) {
        return;
    }

    const workspaceState = useWorkspaceStore.getState();
    const workspaceAccessLost = lifecycle.change === 'workspace_membership' && accessLost !== false;
    // The native active-thread reducer cannot observe the shell-owned workspace
    // selection when no thread is open. Reconcile that selection from the
    // workspace store instead of treating the native lifecycle flag as the
    // complete mobile UI state.
    const activeWorkspaceLost =
        workspaceAccessLost && workspaceState.activeWorkspaceId === lifecycle.workspace_id;
    const preferredWorkspaceLost =
        workspaceAccessLost && workspaceState.preferredWorkspaceId === lifecycle.workspace_id;

    useWorkspaceStore.setState({
        workspaces: workspaceAccessLost
            ? workspaceState.workspaces.filter(
                  (workspace) => workspace.id !== lifecycle.workspace_id,
              )
            : workspaceState.workspaces,
        activeWorkspaceId: activeWorkspaceLost ? null : workspaceState.activeWorkspaceId,
        preferredWorkspaceId: preferredWorkspaceLost ? null : workspaceState.preferredWorkspaceId,
        error: null,
        bootstrappedConnectionId: lifecycle.refresh_workspace_catalog
            ? null
            : workspaceState.bootstrappedConnectionId,
    });

    const threadTreeState = useThreadTreeStore.getState();
    if (activeWorkspaceLost) {
        threadTreeState.reset();
    } else if (
        accessLost === true &&
        threadTreeState.snapshot &&
        threadTreeState.workspaceId === lifecycle.workspace_id
    ) {
        threadTreeState.setSnapshot(
            invalidatedThreadIds.reduce(
                (snapshot, threadId) => removeThreadFromTreeSnapshot(snapshot, threadId),
                threadTreeState.snapshot,
            ),
        );
    } else if (accessLost === null && threadTreeState.workspaceId === lifecycle.workspace_id) {
        // Compatibility with an older Gateway that cannot state whether this
        // connection retained access remains fail-closed.
        threadTreeState.reset();
    }
    if (activeWorkspaceLost || lifecycle.active_thread_cleared) {
        const activeThreadState = useActiveThreadStore.getState();
        activeThreadState.reset();
        useActiveThreadStore.getState().resetDefaultComposerModelSelection();
    }

    if (accessLost === false) {
        for (const threadId of invalidatedThreadIds) {
            void queryClient.invalidateQueries({
                queryKey: threadScopeQueryKeys.detail(threadId),
            });
        }
        return;
    }

    if (workspaceAccessLost || invalidatedThreadIds.length === 0) {
        // Old servers did not identify a thread-scoped access change. Timeline
        // keys carry no workspace authorization metadata, so that compatibility
        // case must invalidate the protected family rather than guess.
        void queryClient.cancelQueries({ queryKey: timelineQueryKeys.all });
        queryClient.removeQueries({ queryKey: timelineQueryKeys.all });
        clearThreadScopeQueries(queryClient);
    } else {
        // The exact eviction keys come from the server-owned notification and
        // shared Rust lifecycle. They are cleanup scope, never a client grant.
        for (const threadId of invalidatedThreadIds) {
            const queryKey = timelineQueryKeys.thread(threadId);
            void queryClient.cancelQueries({ queryKey });
            queryClient.removeQueries({ queryKey });
        }
        clearThreadScopeQueries(queryClient, invalidatedThreadIds);
    }
};

/**
 * Treats every native transport connection boundary as a new authorization
 * epoch. Access-change events emitted while the socket was down are not
 * durable, so no server-authorized projection may remain readable until the
 * current connection bootstraps it again.
 *
 * Gateway registry and device-session credentials live in a separate store and
 * are intentionally untouched.
 */
export const beginMobileAuthorizationEpoch = (queryClient: QueryClient) => {
    useWorkspaceStore.getState().resetConnectionBootstrap();
    clearProtectedMobileProjections(queryClient);
};

export const applyMobileAccessChangedEvent = async (
    event: ClientEvent,
    queryClient: QueryClient,
): Promise<AccessChangedLifecycle | null> => {
    if (accessChangedWorkspaceId(event) === null) {
        return null;
    }

    const expandedKeys = useActiveThreadStore.getState().expandedKeys;
    const invalidatedThreadIds = accessChangedThreadIds(event);
    const result = await applyActiveThreadEvent({
        event,
        expanded_keys: expandedKeys,
    });
    const lifecycle = result.access_changed ?? null;
    await invalidateAdministrationTargets(queryClient, result.administration_refetch ?? []);
    if (lifecycle) {
        applyMobileAccessChangedLifecycle(
            lifecycle,
            queryClient,
            invalidatedThreadIds,
            accessChangedAccessLost(event),
        );
    }
    return lifecycle;
};

export const failClosedMobileAccessChange = (workspaceId: string, queryClient: QueryClient) => {
    applyMobileAccessChangedLifecycle(
        {
            active_scope_cleared: useWorkspaceStore.getState().activeWorkspaceId === workspaceId,
            active_thread_cleared: true,
            applied: true,
            authorization_revision: 0,
            change: 'workspace_membership',
            refresh_workspace_catalog: true,
            workspace_id: workspaceId,
        },
        queryClient,
        [],
        null,
    );
};

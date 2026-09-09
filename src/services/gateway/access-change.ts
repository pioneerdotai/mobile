import type { IdentityAuthorizationPublication } from '@/client/generated/identity_authorization_publication';
import type { QueryClient } from '@tanstack/react-query';

import type { ClientActiveThreadEventResult, ClientEvent } from '@/client';
import { pioneerClient } from '@/client';
import {
    clearAdministrationQueries,
    resetAuthorizationCapabilityQueries,
} from '@/services/administration/query';
import { applyActiveThreadEvent } from '@/services/threads/active';
import { timelineQueryKeys } from '@/services/threads/timeline-query';
import { clearThreadScopeQueries, threadScopeQueryKeys } from '@/services/threads/scope';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useThreadTreeStore } from '@/stores/thread-tree';
import { useWorkspaceStore } from '@/stores/workspace';

type AccessChangedLifecycle = NonNullable<ClientActiveThreadEventResult['access_changed']>;
type GatewayNotificationEvent = Extract<ClientEvent, { GatewayNotification: unknown }>;
type AccessChangedNotification = Extract<
    GatewayNotificationEvent['GatewayNotification'],
    { kind: 'access_changed' }
>['params'];

const clearProtectedMobileProjections = (queryClient: QueryClient) => {
    useActiveThreadStore.getState().reset();
    revalidateMobileAuthorizationProjections(queryClient);
};

/** A missed policy notification requires fresh data, not a new editing session. */
export const revalidateMobileAuthorizationProjections = (queryClient: QueryClient) => {
    void queryClient.cancelQueries({ queryKey: timelineQueryKeys.all });
    queryClient.removeQueries({ queryKey: timelineQueryKeys.all });
    clearThreadScopeQueries(queryClient);
    void clearAdministrationQueries(queryClient);
};

const accessChangedNotification = (event: ClientEvent): AccessChangedNotification | null => {
    if (!('GatewayNotification' in event)) {
        return null;
    }
    const notification = event.GatewayNotification;
    return notification.kind === 'access_changed' ? notification.params : null;
};

export const accessChangedWorkspaceId = (event: ClientEvent): string | null =>
    accessChangedNotification(event)?.workspace_id ?? null;

/**
 * Provider catalogs are workspace-authorized projections. Thread-only access
 * changes do not invalidate them; workspace membership changes do.
 */
export const providerAccessChangedWorkspaceId = (event: ClientEvent): string | null => {
    const notification = accessChangedNotification(event);
    return notification?.change === 'workspace_membership' ? notification.workspace_id : null;
};

export const applyMobileAccessChangedLifecycle = (
    lifecycle: AccessChangedLifecycle,
    queryClient: QueryClient,
    invalidatedThreadIds: readonly string[],
    outcome: AccessChangedNotification['outcome'],
) => {
    if (!lifecycle.applied) {
        return;
    }

    const workspaceState = useWorkspaceStore.getState();
    const accessRevoked = outcome === 'revoked';
    const workspaceAccessLost = lifecycle.change === 'workspace_membership' && accessRevoked;
    const activeWorkspaceLost = lifecycle.active_scope_cleared;

    useWorkspaceStore.setState({
        bootstrappedConnectionId: lifecycle.refresh_workspace_catalog
            ? null
            : workspaceState.bootstrappedConnectionId,
    });

    if (activeWorkspaceLost || lifecycle.active_thread_cleared) {
        const activeThreadState = useActiveThreadStore.getState();
        activeThreadState.reset();
    }

    if (!accessRevoked) {
        for (const threadId of invalidatedThreadIds) {
            void queryClient.invalidateQueries({
                queryKey: threadScopeQueryKeys.detail(threadId),
            });
        }
        return;
    }

    if (workspaceAccessLost || invalidatedThreadIds.length === 0) {
        // Workspace-wide revocation has no exact thread key, so every protected
        // timeline projection must be cleared rather than guessed locally.
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
    const notification = accessChangedNotification(event);
    return notification ? applyPublishedMobileAccessChange(notification, queryClient) : null;
};

/** Synchronous publication-to-legacy projection; Client alone chooses cleanup scope. */
export const applyPublishedMobileAccessProjection = (
    publication: IdentityAuthorizationPublication,
    queryClient: QueryClient,
): AccessChangedLifecycle | null => {
    const notification = publication.access_change;
    if (!notification) return null;
    const workspace = useWorkspaceStore.getState();
    const tree = useThreadTreeStore.getState();
    const activeThreadId = useActiveThreadStore.getState().activeComposerThreadId;
    const knownThreads = Object.keys(tree.snapshot?.threads_by_id ?? {}).map((threadId) => ({
        thread_id: threadId,
        workspace_id: tree.workspaceId!,
    }));
    if (
        activeThreadId &&
        workspace.activeWorkspaceId &&
        !knownThreads.some((scope) => scope.thread_id === activeThreadId)
    ) {
        knownThreads.push({ thread_id: activeThreadId, workspace_id: workspace.activeWorkspaceId });
    }
    const plan = pioneerClient.authorizationAccessChangePlan({
        schema_version: 1,
        connection_generation: publication.connection_generation,
        change_sequence: publication.authorization_change_sequence,
        active_workspace_id: workspace.activeWorkspaceId,
        active_thread_id: activeThreadId,
        known_threads: knownThreads,
    });
    const lifecycle: AccessChangedLifecycle = {
        authorization_revision: plan.authorization_revision,
        workspace_id: plan.workspace_id,
        change: plan.change,
        applied: plan.apply,
        active_scope_cleared: plan.clear_active_workspace,
        active_thread_cleared: plan.clear_active_thread,
        refresh_workspace_catalog: plan.effects.some((effect) => effect === 'RefreshWorkspaceList'),
    };
    applyMobileAccessChangedLifecycle(
        lifecycle,
        queryClient,
        plan.invalidate_thread_ids,
        notification.outcome,
    );
    return lifecycle;
};

/** Applies accepted Client authorization input to the unported thread/workspace owners. */
export const applyPublishedMobileAccessChange = async (
    notification: AccessChangedNotification,
    queryClient: QueryClient,
    isCurrent: () => boolean = () => true,
    publishedLifecycle?: AccessChangedLifecycle | null,
): Promise<AccessChangedLifecycle | null> => {
    if (!isCurrent()) {
        return null;
    }
    const event: ClientEvent = {
        GatewayNotification: { kind: 'access_changed', params: notification },
    };
    const expandedKeys = useActiveThreadStore.getState().expandedKeys;
    const threadId = notification.thread_id?.trim();
    const invalidatedThreadIds = threadId ? [threadId] : [];
    const result = await applyActiveThreadEvent({
        event,
        expanded_keys: expandedKeys,
    });
    if (!isCurrent()) {
        return null;
    }
    const lifecycle =
        publishedLifecycle === undefined ? (result.access_changed ?? null) : publishedLifecycle;
    if (!isCurrent()) {
        return null;
    }
    await resetAuthorizationCapabilityQueries(queryClient);
    if (!isCurrent()) {
        return null;
    }
    if (lifecycle && publishedLifecycle === undefined) {
        applyMobileAccessChangedLifecycle(
            lifecycle,
            queryClient,
            invalidatedThreadIds,
            notification.outcome,
        );
    }
    return lifecycle;
};

export const failClosedMobileAccessChange = (_workspaceId: string, queryClient: QueryClient) =>
    beginMobileAuthorizationEpoch(queryClient);

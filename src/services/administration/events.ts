import type { QueryClient } from '@tanstack/react-query';

import type { AuthMeResponse, ClientEvent } from '@/client';
import {
    administrationQueryKeys,
    invalidateAdministrationTargets,
    resetAuthorizationCapabilityQueries,
} from '@/services/administration/query';
import { applyActiveThreadEvent, openActiveThreadById } from '@/services/threads/active';
import {
    cacheActiveThreadSnapshot,
    clearThreadQueryCache,
} from '@/services/threads/timeline-query';
import { clearThreadScopeQueries } from '@/services/threads/scope';
import { useActiveThreadStore } from '@/stores/active-thread';

export const isAdministrationEvent = (event: ClientEvent): boolean => {
    if (!('GatewayNotification' in event)) return false;
    return [
        'authorization_projection_changed',
        'invitation_changed',
        'member_changed',
        'workspace_members_changed',
    ].includes(event.GatewayNotification.kind);
};

export const applyMobileAdministrationEvent = async (
    event: ClientEvent,
    queryClient: QueryClient,
): Promise<void> => {
    if (!isAdministrationEvent(event)) return;
    if (
        'GatewayNotification' in event &&
        event.GatewayNotification.kind === 'authorization_projection_changed'
    ) {
        const activeThreadState = useActiveThreadStore.getState();
        const activeThreadId = activeThreadState.activeComposerThreadId;
        const expandedKeys = activeThreadState.expandedKeys;
        // Apply the event to the native active-thread store as well as its
        // connection-epoch authorization fence. Otherwise old pending
        // requests and conversation snapshots survive a role/ACL generation
        // change even after the capability query has been reset.
        await applyActiveThreadEvent({ event, expanded_keys: expandedKeys });
        await resetAuthorizationCapabilityQueries(queryClient);

        if (event.GatewayNotification.params.affected.scope === 'invitation') {
            return;
        }

        // A policy generation can invalidate an exact thread, a workspace, or
        // every loaded thread. Clear rather than merely mark stale so no old
        // permission prompt or protected timeline remains visible while the
        // current-ACL reload runs.
        clearThreadScopeQueries(queryClient);
        await clearThreadQueryCache(queryClient);

        if (activeThreadId) {
            try {
                const snapshot = await openActiveThreadById({
                    thread_id: activeThreadId,
                    expanded_keys: expandedKeys,
                });
                cacheActiveThreadSnapshot(queryClient, snapshot);
            } catch {
                activeThreadState.reset();
                useActiveThreadStore.getState().resetDefaultComposerModelSelection();
            }
        }
        return;
    }
    const result = await applyActiveThreadEvent({
        event,
        expanded_keys: useActiveThreadStore.getState().expandedKeys,
    });
    await invalidateAdministrationTargets(queryClient, result.administration_refetch ?? []);

    if (
        'GatewayNotification' in event &&
        event.GatewayNotification.kind === 'member_changed' &&
        (result.administration_refetch ?? []).some((target) => target.kind === 'member_directory')
    ) {
        const currentPrincipalId = event.GatewayNotification.params.principal_id;
        const currentPrincipalChanged = queryClient
            .getQueriesData<AuthMeResponse>({
                queryKey: administrationQueryKeys.currentPrincipal(),
            })
            .some(([, current]) => current?.principal.id === currentPrincipalId);
        if (currentPrincipalChanged) {
            await queryClient.invalidateQueries({
                queryKey: administrationQueryKeys.currentPrincipal(),
            });
        }
    }
};

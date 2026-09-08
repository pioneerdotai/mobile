import type { QueryClient } from '@tanstack/react-query';

import type { AuthMeResponse, ClientEvent } from '@/client';
import {
    administrationQueryKeys,
    invalidateAdministrationTargets,
    resetAuthorizationCapabilityQueries,
} from '@/services/administration/query';
import { applyActiveThreadEvent, openActiveThreadById } from '@/services/threads/active';
import { cacheActiveThreadSnapshot, timelineQueryKeys } from '@/services/threads/timeline-query';
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
        return applyPublishedMobilePolicyChange(event.GatewayNotification.params, queryClient);
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

/** Removes old protected query values synchronously at publication delivery. */
export const evictPublishedMobilePolicyProjection = (
    change: Extract<
        Extract<ClientEvent, { GatewayNotification: unknown }>['GatewayNotification'],
        { kind: 'authorization_projection_changed' }
    >['params'],
    queryClient: QueryClient,
): Promise<void> => {
    const capabilityReset = resetAuthorizationCapabilityQueries(queryClient);
    if (change.affected.scope !== 'invitation') {
        clearThreadScopeQueries(queryClient);
        void queryClient.cancelQueries({ queryKey: timelineQueryKeys.all });
        queryClient.removeQueries({ queryKey: timelineQueryKeys.all });
    }
    return capabilityReset;
};

/** Delivers Client-accepted policy invalidation to the remaining thread presentation. */
export const applyPublishedMobilePolicyChange = async (
    change: Extract<
        Extract<ClientEvent, { GatewayNotification: unknown }>['GatewayNotification'],
        { kind: 'authorization_projection_changed' }
    >['params'],
    queryClient: QueryClient,
    isCurrent: () => boolean = () => true,
    eviction?: Promise<void>,
): Promise<void> => {
    if (!isCurrent()) {
        return;
    }
    const event: ClientEvent = {
        GatewayNotification: { kind: 'authorization_projection_changed', params: change },
    };
    const activeThreadState = useActiveThreadStore.getState();
    const activeThreadId = activeThreadState.activeComposerThreadId;
    const expandedKeys = activeThreadState.expandedKeys;
    const capabilityReset = eviction ?? evictPublishedMobilePolicyProjection(change, queryClient);
    await Promise.all([
        applyActiveThreadEvent({ event, expanded_keys: expandedKeys }),
        capabilityReset,
    ]);
    if (!isCurrent() || change.affected.scope === 'invitation') {
        return;
    }

    if (activeThreadId) {
        try {
            const snapshot = await openActiveThreadById({
                thread_id: activeThreadId,
                expanded_keys: expandedKeys,
            });
            if (isCurrent()) {
                cacheActiveThreadSnapshot(queryClient, snapshot);
            }
        } catch {
            if (!isCurrent()) {
                return;
            }
            activeThreadState.reset();
        }
    }
    return;
};

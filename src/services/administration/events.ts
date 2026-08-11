import type { QueryClient } from '@tanstack/react-query';

import type { AuthMeResponse, ClientEvent } from '@/client';
import {
    administrationQueryKeys,
    invalidateAdministrationTargets,
} from '@/services/administration/query';
import { applyActiveThreadEvent } from '@/services/threads/active';
import { useActiveThreadStore } from '@/stores/active-thread';

export const isAdministrationEvent = (event: ClientEvent): boolean => {
    if (!('GatewayNotification' in event)) return false;
    return ['invitation_changed', 'member_changed', 'workspace_members_changed'].includes(
        event.GatewayNotification.kind,
    );
};

export const applyMobileAdministrationEvent = async (
    event: ClientEvent,
    queryClient: QueryClient,
): Promise<void> => {
    if (!isAdministrationEvent(event)) return;
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
        const current = queryClient.getQueryData<AuthMeResponse>(
            administrationQueryKeys.currentPrincipal(),
        );
        if (current?.principal.id === event.GatewayNotification.params.principal_id) {
            await queryClient.invalidateQueries({
                queryKey: administrationQueryKeys.currentPrincipal(),
            });
        }
    }
};

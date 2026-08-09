import type { QueryClient } from '@tanstack/react-query';

import type { ClientEvent } from '@/client';
import { invalidateAdministrationTargets } from '@/services/administration/query';
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
};

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { reconcileTurnWorkItemsOnReconnect } from '@/services/threads/turn-work-reconciliation';
import { useGatewayStore } from '@/stores/gateway';

export const useTimelineReconnectInvalidation = (
    activeThreadId: string | null,
    enabled: boolean,
) => {
    const queryClient = useQueryClient();
    const connectionState = useGatewayStore((state) => state.connectionState);
    const previousConnectionStateRef = useRef(connectionState);

    useEffect(() => {
        if (
            enabled &&
            activeThreadId &&
            previousConnectionStateRef.current !== 'Connected' &&
            connectionState === 'Connected'
        ) {
            void reconcileTurnWorkItemsOnReconnect(queryClient, activeThreadId);
        }

        previousConnectionStateRef.current = connectionState;
    }, [activeThreadId, connectionState, enabled, queryClient]);
};

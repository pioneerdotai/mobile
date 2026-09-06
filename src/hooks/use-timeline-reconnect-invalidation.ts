import { useEffect, useRef } from 'react';
import { mobileClientBinding } from '@/client/mobile-client-binding';
import { useGatewayStore } from '@/stores/gateway';

export const useTimelineReconnectInvalidation = (threadId: string | null, enabled: boolean) => {
    const connectionState = useGatewayStore((state) => state.connectionState);
    const previous = useRef(connectionState);
    useEffect(() => {
        if (
            enabled &&
            threadId &&
            previous.current !== 'Connected' &&
            connectionState === 'Connected'
        ) {
            mobileClientBinding.dispatch({
                schema_version: 1,
                intent: { kind: 'refresh_timeline', thread_id: threadId },
            });
        }
        previous.current = connectionState;
    }, [threadId, enabled, connectionState]);
};

import { useLayoutEffect, useState } from 'react';
import { useNavigation } from 'expo-router';
import { useGatewayStore } from '@/stores/gateway';
import { useWorkspaceStore } from '@/stores/workspace';
import { mobileStartup, recordMobileMeasurement } from './mobile-startup';
import { ThreadOpeningTimeline } from './thread-opening-timeline';

export const threadOpening = new ThreadOpeningTimeline(recordMobileMeasurement);
export const threadOpeningScope = () => {
    const gateway = useGatewayStore.getState();
    return {
        gatewayId: gateway.registry.active_gateway_id ?? null,
        connectionId: gateway.sessionConnectionGeneration,
        workspaceId: useWorkspaceStore.getState().activeWorkspaceId,
    };
};
export const beginThreadOpening = (target: string): void => {
    mobileStartup.complete('cancelled');
    threadOpening.begin(target, threadOpeningScope());
};

// Invoked by the route before its asynchronous open/create effects. Explicit
// action sites capture the earlier navigation action; deep links start at focus.
export const useThreadOpeningRoute = (target: string | null): number | null => {
    const [token, setToken] = useState<number | null>(null);
    const gateway = useGatewayStore((state) => state);
    const workspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const navigation = useNavigation();
    useLayoutEffect(() => {
        if (!target) return;
        let attempt: number | null = null;
        const start = () => {
            if (attempt !== null) return;
            attempt = threadOpening.claim(target, threadOpeningScope());
            setToken(attempt);
        };
        const stop = () => {
            if (attempt !== null) threadOpening.finish(attempt, 'cancelled');
            attempt = null;
            setToken(null);
        };
        const focus = navigation.addListener('focus', start);
        const blur = navigation.addListener('blur', stop);
        if (navigation.isFocused()) start();
        return () => {
            focus();
            blur();
            stop();
        };
    }, [target, navigation]);
    useLayoutEffect(() => {
        if (token === null) return;
        const terminal = gateway.sessionTerminalReason;
        threadOpening.observe(
            token,
            threadOpeningScope(),
            terminal
                ? terminal === 'secure_storage_failed'
                    ? 'degraded'
                    : 'authentication_required'
                : !gateway.registry.active_gateway_id
                  ? 'setup_required'
                  : null,
        );
    }, [
        token,
        gateway.sessionConnectionGeneration,
        gateway.registry.active_gateway_id,
        gateway.sessionTerminalReason,
        workspaceId,
    ]);
    return token;
};

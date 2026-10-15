import { useShallow } from 'zustand/react/shallow';
import { hydrateOnboarding } from '@/client/onboarding';
import { useGatewayStore } from '@/stores/gateway';

/** Native navigation/session presentation reads the Client registry projection. */
export const useGateway = () => {
    const value = useGatewayStore(
        useShallow((state) => ({
            registry: state.registry,
            bootstrapped: state.bootstrapped,
            busy: state.busy,
            error: state.error,
            connectionId: state.connectionId,
            connectionState: state.connectionState,
            sessionRevision: state.sessionRevision,
        })),
    );
    return { ...value, hydrate: hydrateOnboarding };
};

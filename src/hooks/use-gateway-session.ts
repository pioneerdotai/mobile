import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import type { ClientEvent, GatewayEndpoint } from '@/client';
import {
    connectGatewayEndpoint,
    disconnectGateway,
    nextGatewayEvents,
} from '@/services/gateway/session';
import { useGatewayStore } from '@/stores/gateway';

const errorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
};

const GATEWAY_EVENT_IDLE_POLL_MS = 250;

const wait = (timeoutMs: number) =>
    new Promise((resolve) => {
        setTimeout(resolve, timeoutMs);
    });

const sessionErrorFromClientEvent = (event: ClientEvent): string | null | undefined => {
    if ('GatewayConnectionChanged' in event) {
        const connection = event.GatewayConnectionChanged;
        return connection.connection_state === 'Disconnected' ? connection.gateway_error : null;
    }

    if ('Error' in event) {
        return event.Error.message;
    }

    return undefined;
};

export const useGatewaySession = (
    activeGateway: GatewayEndpoint | null,
    sessionRevision: number,
) => {
    const { t } = useTranslation('gateway');
    const {
        setConnectionId,
        setConnectionGatewayId,
        setConnectionState,
        setLastEvent,
        setSessionError,
    } = useGatewayStore(
        useShallow((state) => ({
            setConnectionId: state.setConnectionId,
            setConnectionGatewayId: state.setConnectionGatewayId,
            setConnectionState: state.setConnectionState,
            setLastEvent: state.setLastEvent,
            setSessionError: state.setSessionError,
        })),
    );
    const activeGatewayAddress = activeGateway?.address ?? null;
    const activeGatewayAuthTokenRef = activeGateway?.auth_token_ref ?? null;
    const activeGatewayId = activeGateway?.id ?? null;
    const activeGatewayKind = activeGateway?.kind ?? null;
    const activeGatewayName = activeGateway?.name ?? '';
    const activeGatewayServiceName = activeGateway?.service_name ?? null;
    const sessionGateway = useMemo(() => {
        if (!activeGatewayId || !activeGatewayAddress || !activeGatewayKind) {
            return null;
        }

        return {
            address: activeGatewayAddress,
            auth_token_ref: activeGatewayAuthTokenRef,
            id: activeGatewayId,
            kind: activeGatewayKind,
            name: activeGatewayName,
            service_name: activeGatewayServiceName,
            workspace_id: null,
        };
    }, [
        activeGatewayAddress,
        activeGatewayAuthTokenRef,
        activeGatewayId,
        activeGatewayKind,
        activeGatewayName,
        activeGatewayServiceName,
    ]);

    useEffect(() => {
        let cancelled = false;

        if (!sessionGateway) {
            setConnectionId(null);
            setConnectionGatewayId(null);
            setConnectionState('Idle');
            setLastEvent(null);
            setSessionError(null);
            return;
        }

        const run = async () => {
            setConnectionId(null);
            setConnectionGatewayId(null);
            setConnectionState('Connecting');
            setLastEvent(null);
            setSessionError(null);

            try {
                const connection = await connectGatewayEndpoint(sessionGateway);
                if (cancelled) {
                    return;
                }
                setConnectionId(connection.connection_id);
                setConnectionGatewayId(sessionGateway.id);

                while (!cancelled) {
                    const events = await nextGatewayEvents();
                    if (cancelled) {
                        break;
                    }

                    if (events.length === 0) {
                        await wait(GATEWAY_EVENT_IDLE_POLL_MS);
                        continue;
                    }

                    for (const event of events) {
                        if (cancelled) {
                            break;
                        }

                        setLastEvent(event, sessionGateway.id, connection.connection_id);
                        if ('GatewayConnectionChanged' in event) {
                            const connectionState = event.GatewayConnectionChanged.connection_state;
                            setConnectionState(connectionState);
                        }

                        const nextSessionError = sessionErrorFromClientEvent(event);
                        if (nextSessionError !== undefined) {
                            setSessionError(nextSessionError);
                        }
                    }
                }
            } catch (caught) {
                if (!cancelled) {
                    setConnectionId(null);
                    setConnectionGatewayId(null);
                    setConnectionState('Disconnected');
                    setSessionError(errorMessage(caught, t('sessionFailed')));
                }
            }
        };

        void run();

        return () => {
            cancelled = true;
            setConnectionId(null);
            setConnectionGatewayId(null);
            setConnectionState('Idle');
            void disconnectGateway();
        };
    }, [
        sessionGateway,
        sessionRevision,
        setConnectionId,
        setConnectionGatewayId,
        setConnectionState,
        setLastEvent,
        setSessionError,
        t,
    ]);
};

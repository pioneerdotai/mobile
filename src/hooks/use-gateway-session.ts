import * as Network from 'expo-network';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import type { ClientEvent, GatewayEndpoint } from '@/client';
import { redactAuthText } from '@/services/auth-redaction';
import {
    connectGatewayEndpoint,
    disconnectGateway,
    gatewaySessionProjection,
    gatewaySessionRefreshDelayMs,
    markMobileGatewayConnectionDisconnected,
    subscribeGatewayEvents,
    subscribeMobileSessionProjection,
} from '@/services/gateway/session';
import {
    MobileSessionTerminalError,
    markMobileGatewaySessionTerminal,
    terminalReasonFromMachineCode,
} from '@/services/gateway/session-coordinator';
import { runGatewayTransportTransition } from '@/services/gateway/transport-coordinator';
import { openActiveThreadById } from '@/services/threads/active';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useGatewayStore } from '@/stores/gateway';

const errorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error) {
        return redactAuthText(error.message);
    }
    return fallback;
};

const sessionErrorFromClientEvent = (event: ClientEvent): string | null | undefined => {
    if ('GatewayConnectionChanged' in event) {
        const connection = event.GatewayConnectionChanged;
        return connection.connection_state === 'Disconnected' && connection.gateway_error
            ? redactAuthText(connection.gateway_error)
            : null;
    }
    if ('Error' in event) {
        return redactAuthText(event.Error.message);
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
        setSessionProjection,
    } = useGatewayStore(
        useShallow((state) => ({
            setConnectionId: state.setConnectionId,
            setConnectionGatewayId: state.setConnectionGatewayId,
            setConnectionState: state.setConnectionState,
            setLastEvent: state.setLastEvent,
            setSessionError: state.setSessionError,
            setSessionProjection: state.setSessionProjection,
        })),
    );
    const sessionEndpointKey = connectionEndpointKey(activeGateway);
    const sessionGateway = useMemo(
        () => activeGateway,
        // Registry metadata such as workspace and display name must not restart the transport.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [sessionEndpointKey],
    );

    useEffect(() => {
        let cancelled = false;
        let appActive = AppState.currentState === 'active';
        let activeConnectionId: number | null = null;
        let refreshTimer: ReturnType<typeof setTimeout> | null = null;
        let connectInFlight: Promise<void> | null = null;
        let silentReplacementInFlight = false;

        const clearRefreshTimer = () => {
            if (refreshTimer !== null) {
                clearTimeout(refreshTimer);
                refreshTimer = null;
            }
        };

        if (!sessionGateway) {
            setConnectionId(null);
            setConnectionGatewayId(null);
            setConnectionState('Idle');
            setLastEvent(null);
            setSessionError(null);
            return;
        }

        const applyCurrentProjection = () => {
            setSessionProjection(gatewaySessionProjection(sessionGateway.id));
        };

        const scheduleRefresh = (connect: (silent?: boolean) => Promise<void>) => {
            clearRefreshTimer();
            if (!appActive || cancelled) {
                return;
            }
            const delay = gatewaySessionRefreshDelayMs(sessionGateway.id);
            if (delay === null) {
                return;
            }
            refreshTimer = setTimeout(() => {
                refreshTimer = null;
                void connect(true);
            }, delay);
        };

        const restoreActiveThreadSubscription = async (): Promise<void> => {
            const activeThreadState = useActiveThreadStore.getState();
            const threadId = activeThreadState.snapshot?.thread_id ?? null;
            if (!threadId) {
                return;
            }

            const snapshot = await openActiveThreadById({
                thread_id: threadId,
                expanded_keys: activeThreadState.expandedKeys,
            });
            if (useActiveThreadStore.getState().snapshot?.thread_id === threadId) {
                useActiveThreadStore.getState().setSnapshot(snapshot);
            }
        };

        const performConnect = async (silent = false): Promise<void> => {
            if (cancelled || !appActive) {
                return;
            }
            const replacingSilently = silent && activeConnectionId !== null;
            if (!replacingSilently) {
                setConnectionState('Connecting');
            }
            try {
                const connection = await runGatewayTransportTransition(async () => {
                    silentReplacementInFlight = replacingSilently;
                    const nextConnection = await connectGatewayEndpoint(sessionGateway);
                    if (!cancelled && appActive && replacingSilently) {
                        // Restore the active subscription before the replacement
                        // connection becomes observable to React. Failure is
                        // retried authoritatively by text/Voice preflight.
                        await restoreActiveThreadSubscription().catch(() => undefined);
                    }
                    return nextConnection;
                });
                if (cancelled || !appActive) {
                    return;
                }
                activeConnectionId = connection.connection_id;
                if (!replacingSilently) {
                    // Keep the React-visible connection generation stable for
                    // a planned replacement. Publishing a new id would make
                    // every screen bootstrap its already loaded data again.
                    setConnectionId(connection.connection_id);
                    setConnectionGatewayId(sessionGateway.id);
                }
                setConnectionState('Connected');
                setSessionError(null);
                setSessionProjection(connection.projection);
                scheduleRefresh(connect);
            } catch (caught) {
                if (cancelled || !appActive) {
                    return;
                }
                activeConnectionId = null;
                setConnectionId(null);
                setConnectionGatewayId(null);
                setConnectionState('Disconnected');
                applyCurrentProjection();
                setSessionError(errorMessage(caught, t('sessionFailed')));
                if (caught instanceof MobileSessionTerminalError) {
                    clearRefreshTimer();
                }
            } finally {
                silentReplacementInFlight = false;
            }
        };

        const connect = (silent = false): Promise<void> => {
            if (connectInFlight) {
                return connectInFlight;
            }
            const operation = performConnect(silent).finally(() => {
                if (connectInFlight === operation) {
                    connectInFlight = null;
                }
            });
            connectInFlight = operation;
            return operation;
        };

        const appStateSubscription = AppState.addEventListener('change', (nextState) => {
            const wasActive = appActive;
            appActive = nextState === 'active';
            if (!appActive) {
                clearRefreshTimer();
                activeConnectionId = null;
                setConnectionId(null);
                setConnectionGatewayId(null);
                setConnectionState('Idle');
                void disconnectGateway(sessionGateway.id).finally(applyCurrentProjection);
            } else if (!wasActive) {
                void connect();
            }
        });
        const networkSubscription = Network.addNetworkStateListener((state) => {
            if (state.isConnected && appActive && activeConnectionId === null) {
                void connect();
            }
        });
        const unsubscribeProjection = subscribeMobileSessionProjection(
            sessionGateway.id,
            setSessionProjection,
        );

        const handleGatewayEvent = async (event: ClientEvent): Promise<void> => {
            if (cancelled) {
                return;
            }
            if (silentReplacementInFlight && 'GatewayConnectionChanged' in event) {
                // Planned token rotation is a transport implementation detail.
                // Do not turn it into Connecting/Connected UI churn.
                return;
            }
            if ('GatewayConnectionChanged' in event) {
                const nextState = event.GatewayConnectionChanged.connection_state;
                const currentState = useGatewayStore.getState().connectionState;
                if (
                    activeConnectionId !== null &&
                    currentState === 'Connected' &&
                    (nextState === 'Connecting' || nextState === 'Reconnecting')
                ) {
                    // A replacement socket can enqueue its progress event just
                    // before `connectGatewayEndpoint` resolves. Keep that late
                    // transport event out of both UI state and thread reducers.
                    return;
                }
            }
            setLastEvent(event, sessionGateway.id, activeConnectionId);
            if ('GatewayNotification' in event) {
                const notification = event.GatewayNotification;
                const currentSessionId = gatewaySessionProjection(sessionGateway.id).sessionId;
                if (
                    notification.kind === 'auth_access_expiring' &&
                    notification.params.session_id === currentSessionId
                ) {
                    void connect(true);
                } else if (
                    notification.kind === 'auth_session_revoked' &&
                    notification.params.session_id === currentSessionId
                ) {
                    clearRefreshTimer();
                    activeConnectionId = null;
                    setConnectionId(null);
                    await markMobileGatewaySessionTerminal(
                        sessionGateway.id,
                        notification.params.reason,
                    );
                    applyCurrentProjection();
                    setConnectionState('Disconnected');
                    setSessionError(notification.params.reason);
                }
            }
            if ('GatewayConnectionChanged' in event) {
                const connection = event.GatewayConnectionChanged;
                const state = connection.connection_state;
                setConnectionState(state);
                if (state === 'Disconnected') {
                    activeConnectionId = null;
                    setConnectionId(null);
                    markMobileGatewayConnectionDisconnected(sessionGateway.id);
                    const terminalReason = terminalReasonFromMachineCode(connection.gateway_error);
                    if (terminalReason) {
                        clearRefreshTimer();
                        await markMobileGatewaySessionTerminal(sessionGateway.id, terminalReason);
                    }
                    applyCurrentProjection();
                    if (appActive && !terminalReason) {
                        void connect();
                    }
                }
            }
            const nextSessionError = sessionErrorFromClientEvent(event);
            if (nextSessionError !== undefined) {
                setSessionError(nextSessionError);
            }
        };
        const unsubscribeGatewayEvents = subscribeGatewayEvents(handleGatewayEvent, (caught) => {
            if (!cancelled && appActive) {
                setConnectionState('Disconnected');
                setSessionError(errorMessage(caught, t('sessionFailed')));
            }
        });

        const run = async () => {
            setConnectionId(null);
            setConnectionGatewayId(null);
            setConnectionState('Connecting');
            setLastEvent(null);
            setSessionError(null);
            applyCurrentProjection();
            await connect();
        };

        void run().catch((caught) => {
            if (!cancelled && appActive) {
                setConnectionState('Disconnected');
                setSessionError(errorMessage(caught, t('sessionFailed')));
            }
        });

        return () => {
            cancelled = true;
            clearRefreshTimer();
            appStateSubscription.remove();
            networkSubscription.remove();
            unsubscribeProjection();
            unsubscribeGatewayEvents();
            setConnectionId(null);
            setConnectionGatewayId(null);
            setConnectionState('Idle');
            void disconnectGateway(sessionGateway.id);
        };
    }, [
        sessionGateway,
        sessionRevision,
        setConnectionId,
        setConnectionGatewayId,
        setConnectionState,
        setLastEvent,
        setSessionError,
        setSessionProjection,
        t,
    ]);
};

const connectionEndpointKey = (endpoint: GatewayEndpoint | null): string | null =>
    endpoint
        ? JSON.stringify([
              endpoint.id,
              endpoint.kind,
              endpoint.address,
              endpoint.server_gateway_id ?? null,
              endpoint.session_ref ?? null,
              endpoint.service_name ?? null,
          ])
        : null;

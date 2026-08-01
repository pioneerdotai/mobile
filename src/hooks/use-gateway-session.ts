import * as Network from 'expo-network';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import type { ClientEvent, GatewayEndpoint } from '@/client';
import { redactAuthText } from '@/services/auth-redaction';
import {
    accessChangedWorkspaceId,
    applyMobileAccessChangedEvent,
    beginMobileAuthorizationEpoch,
    failClosedMobileAccessChange,
} from '@/services/gateway/access-change';
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
import { pioneerQueryClient } from '@/services/query/client';
import { openActiveThreadById } from '@/services/threads/active';
import { cacheActiveThreadSnapshot } from '@/services/threads/timeline-query';
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
    const queryClient = useQueryClient();
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
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let reconnectAttempt = 0;
        let reconnectPending = false;
        let connectInFlight: Promise<void> | null = null;
        let silentReplacementInFlight = false;
        let backgroundTransitionInFlight = false;

        const clearRefreshTimer = () => {
            if (refreshTimer !== null) {
                clearTimeout(refreshTimer);
                refreshTimer = null;
            }
        };

        const clearReconnectTimer = () => {
            if (reconnectTimer !== null) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
        };

        if (!sessionGateway) {
            beginMobileAuthorizationEpoch(queryClient);
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

        const scheduleReconnect = (connect: (silent?: boolean) => Promise<void>) => {
            clearReconnectTimer();
            if (!appActive || cancelled) {
                return;
            }
            const delay = Math.min(500 * 2 ** reconnectAttempt, 10_000);
            reconnectAttempt += 1;
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                void connect(activeConnectionId !== null);
            }, delay);
        };

        const restoreActiveThreadSubscription = async (): Promise<void> => {
            const activeThreadState = useActiveThreadStore.getState();
            const threadId = activeThreadState.activeComposerThreadId;
            if (!threadId) {
                return;
            }

            const snapshot = await openActiveThreadById({
                thread_id: threadId,
                expanded_keys: activeThreadState.expandedKeys,
            });
            if (useActiveThreadStore.getState().activeComposerThreadId === threadId) {
                cacheActiveThreadSnapshot(pioneerQueryClient, snapshot);
            }
        };

        const performConnect = async (silent = false): Promise<void> => {
            if (cancelled || !appActive) {
                return;
            }
            const replacingSilently = silent && activeConnectionId !== null;
            if (activeConnectionId === null) {
                // A fresh transport can represent another endpoint,
                // principal, or authorization revision. Evict protected
                // projections before any reconnect result can be rendered;
                // endpoint registry and refresh credentials remain owned by
                // the session coordinator.
                beginMobileAuthorizationEpoch(queryClient);
            }
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
                reconnectAttempt = 0;
                reconnectPending = false;
                clearReconnectTimer();
                scheduleRefresh(connect);
            } catch (caught) {
                if (cancelled || !appActive) {
                    return;
                }
                const terminal = caught instanceof MobileSessionTerminalError;
                const preserveVisibleConnection =
                    !terminal &&
                    activeConnectionId !== null &&
                    gatewaySessionProjection(sessionGateway.id).phase === 'connected';
                if (terminal) {
                    beginMobileAuthorizationEpoch(queryClient);
                }
                if (!preserveVisibleConnection) {
                    activeConnectionId = null;
                    setConnectionId(null);
                    setConnectionGatewayId(null);
                    setConnectionState('Disconnected');
                }
                applyCurrentProjection();
                if (terminal) {
                    reconnectPending = false;
                    setSessionError(errorMessage(caught, t('sessionFailed')));
                    clearRefreshTimer();
                    clearReconnectTimer();
                } else {
                    // A transient transport failure is not an authorization
                    // boundary. Keep already rendered data on screen and
                    // recover the session in the background.
                    if (!preserveVisibleConnection) {
                        setSessionError(errorMessage(caught, t('sessionFailed')));
                    }
                    reconnectPending = true;
                    scheduleReconnect(connect);
                }
            } finally {
                silentReplacementInFlight = false;
            }
        };

        const connect = (silent = false): Promise<void> => {
            clearReconnectTimer();
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

        const suspendInBackground = (): void => {
            if (backgroundTransitionInFlight) {
                return;
            }

            backgroundTransitionInFlight = true;
            clearRefreshTimer();
            clearReconnectTimer();
            void runGatewayTransportTransition(async () => {
                try {
                    await disconnectGateway(sessionGateway.id);
                } finally {
                    applyCurrentProjection();
                }
            }).catch(() => undefined);
        };

        const resumeFromBackground = async (): Promise<void> => {
            const pendingConnection = connectInFlight;
            if (pendingConnection) {
                await pendingConnection.catch(() => undefined);
            }
            if (cancelled || !appActive) {
                return;
            }

            try {
                // The published connection generation and all loaded screen
                // data stay intact while the native transport and active
                // thread subscription are restored behind the existing UI.
                await connect(true);
            } finally {
                if (appActive) {
                    backgroundTransitionInFlight = false;
                }
            }
        };

        const appStateSubscription = AppState.addEventListener('change', (nextState) => {
            appActive = nextState === 'active';

            if (nextState === 'background') {
                suspendInBackground();
            } else if (nextState === 'inactive') {
                // Control Center, the app switcher, and other short iOS
                // interruptions are not a transport boundary.
                clearRefreshTimer();
                clearReconnectTimer();
            } else if (backgroundTransitionInFlight) {
                void resumeFromBackground();
            } else if (reconnectPending) {
                // A short iOS interruption may have cancelled a pending
                // reconnect while no ephemeral access credential exists.
                void connect(activeConnectionId !== null);
            } else {
                scheduleRefresh(connect);
            }
        });
        const networkSubscription = Network.addNetworkStateListener((state) => {
            if (
                state.isConnected &&
                appActive &&
                (activeConnectionId === null || reconnectPending)
            ) {
                void connect(activeConnectionId !== null);
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
            if (
                (silentReplacementInFlight || backgroundTransitionInFlight) &&
                'GatewayConnectionChanged' in event
            ) {
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
            const accessChangedWorkspace = accessChangedWorkspaceId(event);
            if (accessChangedWorkspace !== null) {
                try {
                    await applyMobileAccessChangedEvent(event, queryClient);
                } catch {
                    // Cache eviction is fail-closed even if the native
                    // projection cannot be reduced. Registry and session
                    // credentials are deliberately untouched.
                    failClosedMobileAccessChange(accessChangedWorkspace, queryClient);
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
                    beginMobileAuthorizationEpoch(queryClient);
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
                beginMobileAuthorizationEpoch(queryClient);
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
                beginMobileAuthorizationEpoch(queryClient);
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
            clearReconnectTimer();
            beginMobileAuthorizationEpoch(queryClient);
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
        queryClient,
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

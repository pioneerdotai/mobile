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
    providerAccessChangedWorkspaceId,
} from '@/services/gateway/access-change';
import {
    applyMobileAdministrationEvent,
    isAdministrationEvent,
} from '@/services/administration/events';
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
import type { MobileSessionProjection } from '@/services/gateway/session-coordinator';
import { runGatewayTransportTransition } from '@/services/gateway/transport-coordinator';
import { pioneerQueryClient } from '@/services/query/client';
import { openActiveThreadById } from '@/services/threads/active';
import { cacheActiveThreadSnapshot } from '@/services/threads/timeline-query';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useGatewayStore } from '@/stores/gateway';
import { useWorkspaceStore } from '@/stores/workspace';
import { mobileStartup } from '@/services/telemetry/mobile-startup';
import {
    applyCliRuntimeSummaryUpdate,
    clearCliRuntimeSummaries,
    loadCliRuntimeSummariesInBackground,
} from '@/services/providers/cli-runtime-snapshot';

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
        let startupSessionInstrumentationActive = false;
        let startupTransportStageStarted = false;

        const beginAuthorizationEpoch = (): void => {
            beginMobileAuthorizationEpoch(queryClient);
            clearCliRuntimeSummaries();
        };

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
            beginAuthorizationEpoch();
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

        const observeStartupSessionProjection = (projection: MobileSessionProjection): void => {
            if (!startupSessionInstrumentationActive) {
                return;
            }
            if (projection.phase === 'connecting' || projection.phase === 'connected') {
                mobileStartup.succeed('authorization.load');
                if (!startupTransportStageStarted) {
                    startupTransportStageStarted = true;
                    mobileStartup.begin('gateway_session.connect');
                }
            }
            if (projection.phase === 'connected') {
                mobileStartup.succeed('gateway_session.connect');
                startupSessionInstrumentationActive = false;
            }
        };

        const failStartupSessionInstrumentation = (): void => {
            if (!startupSessionInstrumentationActive) {
                return;
            }
            if (startupTransportStageStarted) {
                mobileStartup.fail('gateway_session.connect');
            } else {
                mobileStartup.fail('authorization.load');
            }
            startupSessionInstrumentationActive = false;
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
                beginAuthorizationEpoch();
            }
            if (!replacingSilently) {
                setConnectionState('Connecting');
                startupSessionInstrumentationActive = true;
                startupTransportStageStarted = false;
                mobileStartup.begin('authorization.load');
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
                if (replacingSilently) {
                    // Snapshot revisions are monotonic only within one
                    // Gateway process. A transparent reconnect may land on a
                    // restarted process with a lower revision, so begin a new
                    // cache epoch and immediately rehydrate the active scope.
                    const workspaceId =
                        useWorkspaceStore.getState().activeWorkspaceId ??
                        sessionGateway.workspace_id;
                    clearCliRuntimeSummaries();
                    if (workspaceId) {
                        loadCliRuntimeSummariesInBackground(workspaceId);
                    }
                }
                if (!replacingSilently) {
                    // Projection updates normally split credential/session
                    // preparation from the native transport handshake. This
                    // final observation also handles a coordinator that was
                    // already connected and therefore had no phase change.
                    observeStartupSessionProjection(connection.projection);
                }
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
                    beginAuthorizationEpoch();
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
                if (!replacingSilently) {
                    failStartupSessionInstrumentation();
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
            (projection) => {
                setSessionProjection(projection);
                observeStartupSessionProjection(projection);
            },
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
            const providerAccessChangedWorkspace = providerAccessChangedWorkspaceId(event);
            if (accessChangedWorkspace !== null) {
                if (providerAccessChangedWorkspace !== null) {
                    // Fence workspace-authorized runtime metadata before the
                    // current-ACL lifecycle is applied. Thread-only access
                    // changes leave this independent projection intact.
                    clearCliRuntimeSummaries(providerAccessChangedWorkspace);
                }
                try {
                    const lifecycle = await applyMobileAccessChangedEvent(event, queryClient);
                    if (
                        providerAccessChangedWorkspace !== null &&
                        lifecycle?.applied &&
                        useWorkspaceStore.getState().activeWorkspaceId ===
                            providerAccessChangedWorkspace
                    ) {
                        // A retained membership/role change keeps the active
                        // workspace but starts a new authorization generation.
                        // Rehydrate the cache without initiating a provider
                        // probe; cliRuntimeList only reads Gateway state.
                        loadCliRuntimeSummariesInBackground(providerAccessChangedWorkspace);
                    }
                } catch {
                    // Cache eviction is fail-closed even if the native
                    // projection cannot be reduced. Registry and session
                    // credentials are deliberately untouched.
                    failClosedMobileAccessChange(accessChangedWorkspace, queryClient);
                }
            }
            if (isAdministrationEvent(event)) {
                try {
                    await applyMobileAdministrationEvent(event, queryClient);
                } catch {
                    // An event is only an invalidation hint. A reconnect or the
                    // next screen query repairs the authoritative snapshot.
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
                    beginAuthorizationEpoch();
                    activeConnectionId = null;
                    setConnectionId(null);
                    await markMobileGatewaySessionTerminal(
                        sessionGateway.id,
                        notification.params.reason,
                    );
                    applyCurrentProjection();
                    setConnectionState('Disconnected');
                    setSessionError(notification.params.reason);
                } else if (notification.kind === 'cli_runtime_status_changed') {
                    applyCliRuntimeSummaryUpdate(
                        notification.params.workspace_id,
                        notification.params.revision ?? 0,
                        notification.params.runtime,
                        notification.params.removed ?? false,
                    );
                } else if (
                    notification.kind === 'cli_runtime_account_updated' ||
                    notification.kind === 'cli_runtime_apps_changed'
                ) {
                    loadCliRuntimeSummariesInBackground(notification.params.workspace_id);
                }
            }
            if ('GatewayConnectionChanged' in event) {
                const connection = event.GatewayConnectionChanged;
                const state = connection.connection_state;
                if (state === 'Disconnected') {
                    markMobileGatewayConnectionDisconnected(sessionGateway.id);
                    const terminalReason = terminalReasonFromMachineCode(connection.gateway_error);
                    if (terminalReason) {
                        clearRefreshTimer();
                        beginAuthorizationEpoch();
                        activeConnectionId = null;
                        setConnectionId(null);
                        await markMobileGatewaySessionTerminal(sessionGateway.id, terminalReason);
                        setConnectionState('Disconnected');
                    } else if (activeConnectionId !== null && appActive) {
                        // A transient transport loss is not an authorization
                        // epoch. Keep the last safe projection visible while
                        // the existing coordinator restores the socket.
                        void connect(true);
                    } else {
                        setConnectionState('Disconnected');
                    }
                    applyCurrentProjection();
                } else {
                    setConnectionState(state);
                }
            }
            const nextSessionError = sessionErrorFromClientEvent(event);
            if (nextSessionError !== undefined) {
                setSessionError(nextSessionError);
            }
        };
        const unsubscribeGatewayEvents = subscribeGatewayEvents(handleGatewayEvent, (caught) => {
            if (!cancelled && appActive) {
                beginAuthorizationEpoch();
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
            beginAuthorizationEpoch();
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
              endpoint.gateway_base_url,
              endpoint.server_gateway_id ?? null,
              endpoint.session_ref ?? null,
              endpoint.service_name ?? null,
          ])
        : null;

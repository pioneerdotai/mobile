import type { IdentityAuthorizationPublication } from '@/client/generated/identity_authorization_publication';
import * as Network from 'expo-network';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { mobileClientBinding, type ClientEvent, type GatewayEndpoint } from '@/client';
import { redactAuthText } from '@/services/auth-redaction';
import {
    applyPublishedMobileAccessChange,
    applyPublishedMobileAccessProjection,
    beginMobileAuthorizationEpoch,
} from '@/services/gateway/access-change';
import {
    applyPublishedMobilePolicyChange,
    evictPublishedMobilePolicyProjection,
    applyMobileAdministrationEvent,
    isAdministrationEvent,
} from '@/services/administration/events';
import {
    connectGatewayEndpoint,
    disconnectGateway,
    gatewaySessionProjection,
    gatewaySessionRefreshDelayMs,
    subscribeGatewaySessionDiagnostics,
    subscribeGatewayEvents,
    subscribeMobileSessionProjection,
} from '@/services/gateway/session';
import {
    MobileSessionTerminalError,
    gatewaySessionPublication,
    mobileSessionReconnectDelayMs,
} from '@/services/gateway/session-coordinator';
import type {
    MobileSessionDiagnosticEvent,
    MobileSessionProjection,
} from '@/services/gateway/session-coordinator';
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

        const observeStartupSessionDiagnostic = (event: MobileSessionDiagnosticEvent): void => {
            if (!startupSessionInstrumentationActive) {
                return;
            }
            if (event.timing) {
                mobileStartup.recordNativeStage(
                    event.stage,
                    event.timing,
                    event.outcome === 'failed',
                );
            } else if (event.outcome === 'started') {
                mobileStartup.begin(event.stage);
            } else if (event.outcome === 'succeeded') {
                mobileStartup.succeed(event.stage);
            } else {
                mobileStartup.fail(event.stage);
            }
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
            const delay = mobileSessionReconnectDelayMs(sessionGateway.id);
            if (delay === null) {
                return;
            }
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
        const unsubscribeTransport = mobileClientBinding
            .scope({ kind: 'session' })
            .subscribe(() => {
                if (cancelled) {
                    return;
                }
                const publication = gatewaySessionPublication();
                const connection = publication?.connections[sessionGateway.id];
                const projection = gatewaySessionProjection(sessionGateway.id);
                if (projection.terminalReason) {
                    clearRefreshTimer();
                    clearReconnectTimer();
                    beginAuthorizationEpoch();
                    activeConnectionId = null;
                    setConnectionId(null);
                    setConnectionGatewayId(null);
                    setConnectionState('Disconnected');
                    setSessionError(projection.terminalReason);
                    return;
                }
                if (connection?.refresh_requested && appActive) {
                    void connect(true);
                }
                if (silentReplacementInFlight || backgroundTransitionInFlight || !appActive) {
                    return;
                }
                if (publication?.startup.endpoint_id !== sessionGateway.id) {
                    return;
                }
                const state = publication.status?.connection_state;
                if (!state) {
                    return;
                }
                if (
                    activeConnectionId !== null &&
                    useGatewayStore.getState().connectionState === 'Connected' &&
                    (state === 'Connecting' || state === 'Reconnecting')
                ) {
                    return;
                }
                if (state === 'Disconnected' && activeConnectionId !== null) {
                    void connect(true);
                } else {
                    setConnectionState(state);
                }
                setSessionError(
                    publication.gateway_error ? redactAuthText(publication.gateway_error) : null,
                );
            });
        const unsubscribeDiagnostics = subscribeGatewaySessionDiagnostics(
            sessionGateway.id,
            observeStartupSessionDiagnostic,
        );

        const identityStore = mobileClientBinding.scope({
            kind: 'administration',
            workspace_id: null,
        });
        let acceptedAccessSequence = 0;
        let acceptedConnectionGeneration: number | null = null;
        let accessDelivery: Promise<void> = Promise.resolve();
        const unsubscribeAuthorization = identityStore.subscribe(() => {
            if (cancelled) {
                return;
            }
            const publication = identityStore.getSnapshot()
                ?.payload as IdentityAuthorizationPublication | null;
            if (!publication) {
                return;
            }
            const generation = publication.connection_generation;
            if (acceptedConnectionGeneration !== generation) {
                if (acceptedConnectionGeneration !== null) {
                    beginAuthorizationEpoch();
                }
                acceptedConnectionGeneration = generation;
                acceptedAccessSequence =
                    publication.access_change || publication.policy_change
                        ? publication.authorization_change_sequence - 1
                        : publication.authorization_change_sequence;
            }
            const change = publication.access_change;
            const policy = publication.policy_change;
            if (
                (!change && !policy) ||
                publication.authorization_change_sequence <= acceptedAccessSequence
            ) {
                return;
            }
            if (publication.authorization_change_sequence !== acceptedAccessSequence + 1) {
                beginAuthorizationEpoch();
            }
            acceptedAccessSequence = publication.authorization_change_sequence;
            const sequence = publication.authorization_change_sequence;
            const isCurrent = () =>
                !cancelled &&
                acceptedConnectionGeneration === generation &&
                acceptedAccessSequence === sequence;
            if (change?.change === 'workspace_membership') {
                clearCliRuntimeSummaries(change.workspace_id);
            }
            let publishedLifecycle = null;
            try {
                publishedLifecycle = change
                    ? applyPublishedMobileAccessProjection(publication, queryClient)
                    : null;
            } catch {
                beginAuthorizationEpoch();
                return;
            }
            const policyEviction = policy
                ? evictPublishedMobilePolicyProjection(policy, queryClient)
                : undefined;
            accessDelivery = accessDelivery.then(async () => {
                if (!isCurrent()) {
                    return;
                }
                try {
                    if (policy) {
                        await applyPublishedMobilePolicyChange(
                            policy,
                            queryClient,
                            isCurrent,
                            policyEviction,
                        );
                        return;
                    }
                    if (!change) {
                        return;
                    }
                    const lifecycle = await applyPublishedMobileAccessChange(
                        change,
                        queryClient,
                        isCurrent,
                        publishedLifecycle,
                    );
                    if (
                        isCurrent() &&
                        change.change === 'workspace_membership' &&
                        lifecycle?.applied &&
                        useWorkspaceStore.getState().activeWorkspaceId === change.workspace_id
                    ) {
                        loadCliRuntimeSummariesInBackground(change.workspace_id);
                    }
                } catch {
                    if (isCurrent()) {
                        beginAuthorizationEpoch();
                    }
                }
            });
        });

        const handleGatewayEvent = async (event: ClientEvent): Promise<void> => {
            if (cancelled) {
                return;
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
                if (notification.kind === 'cli_runtime_status_changed') {
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
            unsubscribeDiagnostics();
            unsubscribeTransport();
            unsubscribeAuthorization();
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

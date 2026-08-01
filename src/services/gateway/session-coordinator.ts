import { PioneerClientNativeError, pioneerClient } from '@/client';
import { nanoid } from 'nanoid';
import type {
    AuthRefreshGrant,
    ClientGatewaySessionLifecycleResult,
    ClientGatewayWsTimings,
    GatewayEndpoint,
    SessionTerminalReason,
} from '@/client';
import {
    MOBILE_GATEWAY_SESSION_SCHEMA_VERSION,
    MobileGatewaySessionStorageError,
    readMobileGatewaySession,
    writeMobileGatewaySession,
} from './session-storage';
import type { MobileGatewaySessionEnvelope } from './session-storage';
import { loadGatewayRegistry } from './registry';
import { DEVICE_SESSION_AUTH_PROTOCOL_VERSION, isRefreshCredential } from './refresh-credential';

export const MOBILE_ACCESS_REFRESH_LEEWAY_SECONDS = 60;

const AUTH_EXCHANGE_TRANSPORT_BEFORE_REQUEST_CODE = 'auth_exchange_transport_before_request';

export type MobileSessionLifecyclePhase =
    | 'needs_authentication'
    | 'loading_session'
    | 'refreshing'
    | 'connecting'
    | 'connected'
    | 'transiently_disconnected'
    | 'revoked'
    | 'compromised'
    | 'expired'
    | 'gateway_mismatch'
    | 'storage_failed';

export type MobileSessionProjection = {
    phase: MobileSessionLifecyclePhase;
    deviceId: string | null;
    sessionId: string | null;
    accessExpiresAtUnix: number | null;
    terminalReason: SessionTerminalReason | null;
    connectionGeneration: number | null;
};

export type MobileSessionEphemeralAccess = {
    accessToken: string;
    accessExpiresAtUnix: number;
};

export type MobileGatewayConnection = {
    connection_id: number;
    projection: MobileSessionProjection;
};

export class MobileSessionTerminalError extends Error {
    readonly reason: SessionTerminalReason;

    constructor(reason: SessionTerminalReason, message: string = reason) {
        super(message);
        this.name = 'MobileSessionTerminalError';
        this.reason = reason;
    }
}

export class MobileSessionSuspendedError extends Error {
    constructor() {
        super('mobile Gateway session was suspended');
        this.name = 'MobileSessionSuspendedError';
    }
}

type RuntimeSession = {
    access: MobileSessionEphemeralAccess | null;
    connectionId: number | null;
    connectionGeneration: number | null;
    displayMetadata: ReturnType<typeof metadata> | null;
    envelope: MobileGatewaySessionEnvelope | null;
    terminalReason: SessionTerminalReason | null;
    phase: MobileSessionLifecyclePhase;
    lifecycleEpoch: number;
    suspendPromise: Promise<void> | null;
};

const runtimes = new Map<string, RuntimeSession>();
const inFlight = new Map<string, { epoch: number; promise: Promise<MobileGatewayConnection> }>();
const listeners = new Map<string, Set<(projection: MobileSessionProjection) => void>>();
let transportBarrier: Promise<void> = Promise.resolve();
let activeTransportEndpointId: string | null = null;

const runtimeFor = (endpointId: string): RuntimeSession => {
    const current = runtimes.get(endpointId);
    if (current) {
        return current;
    }
    const created: RuntimeSession = {
        access: null,
        connectionId: null,
        connectionGeneration: null,
        displayMetadata: null,
        envelope: null,
        terminalReason: null,
        phase: 'needs_authentication',
        lifecycleEpoch: 0,
        suspendPromise: null,
    };
    runtimes.set(endpointId, created);
    return created;
};

export const ensureMobileGatewaySession = (
    endpoint: GatewayEndpoint,
    timings: ClientGatewayWsTimings,
): Promise<MobileGatewayConnection> => {
    const current = inFlight.get(endpoint.id);
    if (current) {
        if (current.epoch === runtimeFor(endpoint.id).lifecycleEpoch) {
            return current.promise;
        }
        return current.promise
            .catch(() => undefined)
            .then(() => ensureMobileGatewaySession(endpoint, timings));
    }
    const epoch = runtimeFor(endpoint.id).lifecycleEpoch;
    const operation = ensureSerialized(endpoint, timings, epoch).finally(() => {
        if (inFlight.get(endpoint.id)?.promise === operation) {
            inFlight.delete(endpoint.id);
        }
    });
    inFlight.set(endpoint.id, { epoch, promise: operation });
    return operation;
};

const ensureSerialized = async (
    requestedEndpoint: GatewayEndpoint,
    timings: ClientGatewayWsTimings,
    lifecycleEpoch: number,
): Promise<MobileGatewayConnection> => {
    const runtime = runtimeFor(requestedEndpoint.id);
    await runtime.suspendPromise;
    if (runtime.lifecycleEpoch !== lifecycleEpoch) {
        throw new MobileSessionSuspendedError();
    }
    if (runtime.terminalReason) {
        throw new MobileSessionTerminalError(runtime.terminalReason);
    }
    const installationId = await loadInstallationIdOrStop(requestedEndpoint.id, runtime);
    const now = nowUnix();
    if (
        runtime.connectionId !== null &&
        runtime.access &&
        runtime.access.accessExpiresAtUnix > now + MOBILE_ACCESS_REFRESH_LEEWAY_SECONDS
    ) {
        return connectionResult(runtime);
    }

    if (
        runtime.connectionId === null &&
        runtime.connectionGeneration !== null &&
        runtime.access &&
        runtime.envelope &&
        runtime.access.accessExpiresAtUnix > now + MOBILE_ACCESS_REFRESH_LEEWAY_SECONDS
    ) {
        return connectWithAccess(requestedEndpoint, timings, runtime, installationId);
    }

    const endpoint = requestedEndpoint;
    let envelope = runtime.envelope;
    let begin: ClientGatewaySessionLifecycleResult;
    if (runtime.connectionGeneration !== null && envelope) {
        begin = await reduceLifecycle(endpoint.id, {
            kind: 'clock_advanced',
            data: {
                now_unix: now,
                refresh_leeway_seconds: MOBILE_ACCESS_REFRESH_LEEWAY_SECONDS,
            },
        });
        // The runtime copy intentionally contains identity metadata only after
        // a connection is established. Load the refresh credential from
        // SecureStore for the direct refresh call instead of retaining it for
        // the lifetime of the foreground session.
        envelope = await loadSessionEnvelopeOrStop(endpoint, installationId, runtime);
        setRuntimeEnvelope(runtime, envelope);
    } else {
        setPhase(requestedEndpoint.id, runtime, 'loading_session');
        envelope = await loadSessionEnvelopeOrStop(endpoint, installationId, runtime);
        setRuntimeEnvelope(runtime, envelope);
        begin = await reduceLifecycle(endpoint.id, {
            kind: 'stored_session_loaded',
            data: metadata(envelope),
        });
    }
    if (!envelope) {
        throw new Error('mobile Gateway session envelope is missing');
    }
    if (begin.effect.kind !== 'begin_refresh') {
        throw new Error(`shared lifecycle rejected session refresh: ${begin.effect.kind}`);
    }
    const intentId = begin.effect.data.intent_id;
    setPhase(endpoint.id, runtime, 'refreshing');
    const access = await refreshSession(endpoint, envelope, installationId, intentId, runtime);

    setRuntimeAccess(runtime, access);
    if (runtime.lifecycleEpoch !== lifecycleEpoch) {
        clearRuntimeAccess(runtime);
        runtime.connectionGeneration = null;
        if (!runtime.terminalReason) {
            setPhase(endpoint.id, runtime, 'transiently_disconnected');
        }
        throw new MobileSessionSuspendedError();
    }
    setPhase(endpoint.id, runtime, 'connecting');
    return connectWithAccess(endpoint, timings, runtime, installationId, lifecycleEpoch);
};

const loadInstallationIdOrStop = async (
    endpointId: string,
    runtime: RuntimeSession,
): Promise<string> => {
    try {
        const installationId = loadGatewayRegistry().installation_id?.trim();
        if (!installationId) {
            throw new Error('mobile Gateway registry has no installation id');
        }
        return installationId;
    } catch (error) {
        return stopFromLifecycle(
            endpointId,
            { kind: 'auth_failed', data: { reason: 'secure_storage_failed' } },
            runtime,
            error,
        );
    }
};

const loadSessionEnvelopeOrStop = async (
    endpoint: GatewayEndpoint,
    installationId: string,
    runtime: RuntimeSession,
): Promise<MobileGatewaySessionEnvelope> => {
    const sessionRef = endpoint.session_ref?.trim();
    if (!sessionRef || !endpoint.server_gateway_id) {
        return stopFromLifecycle(
            endpoint.id,
            { kind: 'auth_failed', data: { reason: 'authentication_required' } },
            runtime,
            new Error('Gateway endpoint requires device authentication'),
        );
    }
    try {
        const envelope = await readMobileGatewaySession(sessionRef);
        if (!envelope) {
            return stopFromLifecycle(
                endpoint.id,
                { kind: 'auth_failed', data: { reason: 'authentication_required' } },
                runtime,
                new MobileGatewaySessionStorageError('missing'),
            );
        }
        if (envelope.gateway_id !== endpoint.server_gateway_id) {
            return stopFromLifecycle(
                endpoint.id,
                { kind: 'auth_failed', data: { reason: 'gateway_identity_mismatch' } },
                runtime,
                new Error('Gateway session envelope does not match the pinned Gateway'),
            );
        }
        if (envelope.installation_id !== installationId) {
            return stopFromLifecycle(
                endpoint.id,
                { kind: 'auth_failed', data: { reason: 'session_compromised' } },
                runtime,
                new Error('Gateway session envelope does not match this mobile installation'),
            );
        }
        return envelope;
    } catch (error) {
        if (error instanceof MobileSessionTerminalError) {
            throw error;
        }
        if (error instanceof MobileGatewaySessionStorageError) {
            return stopFromLifecycle(
                endpoint.id,
                { kind: 'auth_failed', data: { reason: 'secure_storage_failed' } },
                runtime,
                error,
            );
        }
        throw error;
    }
};

const refreshSession = async (
    endpoint: GatewayEndpoint,
    current: MobileGatewaySessionEnvelope,
    installationId: string,
    intentId: number,
    runtime: RuntimeSession,
): Promise<MobileSessionEphemeralAccess> => {
    let grant: AuthRefreshGrant | null = null;
    try {
        grant = await pioneerClient.gatewayAuthRefresh({
            gateway_base_url: endpoint.gateway_base_url,
            credential: current.refresh_token,
            params: {
                refresh_request_id: randomRequestId(),
            },
        });
    } catch (error) {
        if (isRefreshRequestKnownNotDispatched(error)) {
            // The native auth transport distinguishes connection/handshake
            // failure from losing the response after `auth/refresh` was sent.
            // Only the former may safely reuse the durable one-use credential.
            await resetAfterRetryableRefreshFailure(endpoint.id, runtime);
            throw error;
        }
        const reason = terminalReasonForRefreshError(error);
        const event =
            reason === 'refresh_outcome_unknown'
                ? ({ kind: 'refresh_transport_lost', data: { intent_id: intentId } } as const)
                : ({ kind: 'auth_failed', data: { reason } } as const);
        await stopFromLifecycle(endpoint.id, event, runtime, error);
    }

    const issuedGrant = grant!;
    try {
        try {
            validateRefreshGrant(current, installationId, issuedGrant);
        } catch (error) {
            await bestEffortSessionCleanup(
                endpoint.gateway_base_url,
                issuedGrant.access_token,
                issuedGrant.session.id,
            );
            await stopFromLifecycle(
                endpoint.id,
                { kind: 'auth_failed', data: { reason: 'session_compromised' } },
                runtime,
                error,
            );
        }
        const next: MobileGatewaySessionEnvelope = {
            schema_version: MOBILE_GATEWAY_SESSION_SCHEMA_VERSION,
            gateway_id: current.gateway_id,
            principal_id: current.principal_id,
            device_id: current.device_id,
            session_id: current.session_id,
            token_family_id: current.token_family_id,
            installation_id: current.installation_id,
            refresh_generation: issuedGrant.refresh_generation,
            refresh_expires_at_unix: issuedGrant.refresh_expires_at_unix,
            refresh_token: issuedGrant.refresh_token,
        };
        const access: MobileSessionEphemeralAccess = {
            accessToken: issuedGrant.access_token,
            accessExpiresAtUnix: issuedGrant.access_expires_at_unix,
        };
        await prepareAccessAfterDurableEnvelope(
            endpoint.id,
            endpoint.gateway_base_url,
            endpoint.session_ref ?? endpoint.id,
            next,
            access,
            intentId,
            runtime,
            false,
        );
        return access;
    } finally {
        issuedGrant.access_token = '';
        issuedGrant.refresh_token = '';
        grant = null;
    }
};

const resetAfterRetryableRefreshFailure = async (
    endpointId: string,
    runtime: RuntimeSession,
): Promise<void> => {
    const existingConnectionRemainsUsable =
        runtime.connectionId !== null &&
        runtime.access !== null &&
        runtime.access.accessExpiresAtUnix > nowUnix();
    if (!existingConnectionRemainsUsable) {
        clearRuntimeAccess(runtime);
        runtime.connectionId = null;
        await disconnectMobileGatewayTransport(endpointId);
    }
    runtime.connectionGeneration = null;
    clearRuntimeEnvelopeCredential(runtime);
    if (runtime.terminalReason) {
        return;
    }
    await reduceLifecycle(endpointId, { kind: 'no_stored_session' }).catch(() => undefined);
    setPhase(
        endpointId,
        runtime,
        existingConnectionRemainsUsable ? 'connected' : 'transiently_disconnected',
    );
};

const prepareAccessAfterDurableEnvelope = async (
    endpointId: string,
    gateway_base_url: string,
    sessionRef: string,
    envelope: MobileGatewaySessionEnvelope,
    access: MobileSessionEphemeralAccess,
    intentId: number,
    runtime: RuntimeSession,
    envelopeAlreadyDurable: boolean,
): Promise<void> => {
    let received: ClientGatewaySessionLifecycleResult;
    try {
        received = await reduceLifecycle(endpointId, {
            kind: 'refresh_grant_received',
            data: {
                intent_id: intentId,
                metadata: metadata(envelope),
                access_expires_at_unix: access.accessExpiresAtUnix,
            },
        });
        if (received.effect.kind !== 'persist_refresh_before_access') {
            throw new Error(`shared lifecycle rejected refreshed session: ${received.effect.kind}`);
        }
    } catch (error) {
        // The server has already rotated the one-use refresh credential. Even
        // if the local planner bridge fails, preserve the successor before
        // returning so a retry can never present the consumed predecessor.
        if (!envelopeAlreadyDurable) {
            await persistEnvelopeOrStop(
                endpointId,
                gateway_base_url,
                sessionRef,
                envelope,
                access,
                intentId,
                runtime,
            );
        } else {
            setRuntimeEnvelope(runtime, envelope);
        }
        await resetAfterDurableLifecycleFailure(endpointId, runtime);
        throw error;
    }
    if (!envelopeAlreadyDurable) {
        await persistEnvelopeOrStop(
            endpointId,
            gateway_base_url,
            sessionRef,
            envelope,
            access,
            intentId,
            runtime,
        );
    } else {
        setRuntimeEnvelope(runtime, envelope);
    }
    try {
        const committed = await reduceLifecycle(endpointId, {
            kind: 'secure_storage_committed',
            data: { intent_id: intentId },
        });
        if (committed.effect.kind !== 'connect_with_ephemeral_access') {
            throw new Error(`shared lifecycle rejected secure commit: ${committed.effect.kind}`);
        }
        runtime.connectionGeneration = committed.effect.data.connection_generation;
    } catch (error) {
        await resetAfterDurableLifecycleFailure(endpointId, runtime);
        throw error;
    }
};

const persistEnvelopeOrStop = async (
    endpointId: string,
    gateway_base_url: string,
    sessionRef: string,
    envelope: MobileGatewaySessionEnvelope,
    access: MobileSessionEphemeralAccess,
    intentId: number,
    runtime: RuntimeSession,
): Promise<void> => {
    try {
        await writeMobileGatewaySession(sessionRef, envelope);
        setRuntimeEnvelope(runtime, envelope);
    } catch (error) {
        await bestEffortSessionCleanup(gateway_base_url, access.accessToken, envelope.session_id);
        await stopFromLifecycle(
            endpointId,
            { kind: 'secure_storage_failed', data: { intent_id: intentId } },
            runtime,
            error,
        );
    }
};

const resetAfterDurableLifecycleFailure = async (
    endpointId: string,
    runtime: RuntimeSession,
): Promise<void> => {
    clearRuntimeAccess(runtime);
    runtime.connectionId = null;
    runtime.connectionGeneration = null;
    await disconnectMobileGatewayTransport(endpointId);
    if (runtime.terminalReason) {
        return;
    }
    await reduceLifecycle(endpointId, { kind: 'no_stored_session' }).catch(() => undefined);
    setPhase(endpointId, runtime, 'transiently_disconnected');
};

const bestEffortSessionCleanup = async (
    gateway_base_url: string,
    accessToken: string,
    sessionId: string,
): Promise<void> => {
    await pioneerClient
        .gatewayAuthSessionCleanup({
            gateway_base_url,
            access_token: accessToken,
            session_id: sessionId,
        })
        .catch(() => undefined);
};

const refreshAfterExpiredConnection = async (
    endpoint: GatewayEndpoint,
    timings: ClientGatewayWsTimings,
    runtime: RuntimeSession,
    installationId: string,
    lifecycleEpoch: number,
    intentId: number,
    priorRefreshAttempts: number,
    source: unknown,
): Promise<MobileGatewayConnection> => {
    clearRuntimeAccess(runtime);
    runtime.connectionId = null;
    runtime.connectionGeneration = null;
    if (priorRefreshAttempts >= 1) {
        // A freshly issued access credential also expired before its
        // connection could become authoritative. Reset only the in-memory
        // planner; the successor refresh envelope is already durable and the
        // next explicit retry can safely rotate it again.
        await resetAfterDurableLifecycleFailure(endpoint.id, runtime);
        throw source;
    }

    const envelope = await loadSessionEnvelopeOrStop(endpoint, installationId, runtime);
    setRuntimeEnvelope(runtime, envelope);
    setPhase(endpoint.id, runtime, 'refreshing');
    const access = await refreshSession(endpoint, envelope, installationId, intentId, runtime);
    setRuntimeAccess(runtime, access);
    if (runtime.lifecycleEpoch !== lifecycleEpoch) {
        clearRuntimeAccess(runtime);
        runtime.connectionGeneration = null;
        if (!runtime.terminalReason) {
            setPhase(endpoint.id, runtime, 'transiently_disconnected');
        }
        throw new MobileSessionSuspendedError();
    }
    setPhase(endpoint.id, runtime, 'connecting');
    return connectWithAccess(
        endpoint,
        timings,
        runtime,
        installationId,
        lifecycleEpoch,
        priorRefreshAttempts + 1,
    );
};

const connectWithAccess = async (
    endpoint: GatewayEndpoint,
    timings: ClientGatewayWsTimings,
    runtime: RuntimeSession,
    installationId: string,
    lifecycleEpoch = runtime.lifecycleEpoch,
    expiredConnectionRefreshAttempts = 0,
): Promise<MobileGatewayConnection> => {
    if (!runtime.access || !runtime.envelope || runtime.connectionGeneration === null) {
        throw new Error('mobile session access is not ready');
    }
    const connectionGeneration = runtime.connectionGeneration;
    let replacementClaimedTransport = false;
    try {
        const handshake = await withMobileGatewayTransport(async () => {
            const supersededEndpointId = activeTransportEndpointId;
            const connected = await pioneerClient.gatewaySessionReplaceAccess({
                endpoint,
                server_gateway_id: runtime.envelope!.gateway_id,
                session_id: runtime.envelope!.session_id,
                device_id: runtime.envelope!.device_id,
                access_token: runtime.access!.accessToken,
                access_expires_at_unix: runtime.access!.accessExpiresAtUnix,
                refresh_leeway_seconds: MOBILE_ACCESS_REFRESH_LEEWAY_SECONDS,
                timings,
            });
            activeTransportEndpointId = endpoint.id;
            if (supersededEndpointId && supersededEndpointId !== endpoint.id) {
                markTransportSuperseded(supersededEndpointId);
            }
            replacementClaimedTransport = true;
            if (runtime.lifecycleEpoch !== lifecycleEpoch) {
                await pioneerClient.gatewayDisconnect().catch(() => false);
                activeTransportEndpointId = null;
                throw new MobileSessionSuspendedError();
            }
            const me = await pioneerClient.gatewayAuthMe();
            if (runtime.lifecycleEpoch !== lifecycleEpoch) {
                await pioneerClient.gatewayDisconnect().catch(() => false);
                activeTransportEndpointId = null;
                throw new MobileSessionSuspendedError();
            }
            const identityFailureReason: SessionTerminalReason | null =
                me.gateway.id !== runtime.envelope!.gateway_id
                    ? 'gateway_identity_mismatch'
                    : me.principal.id !== runtime.envelope!.principal_id ||
                        me.principal.kind !== 'superuser' ||
                        me.device.id !== runtime.envelope!.device_id ||
                        me.device.installation_id !== installationId ||
                        me.device.client_kind !== 'mobile' ||
                        me.device.status !== 'active' ||
                        me.session.id !== runtime.envelope!.session_id ||
                        me.session.device_id !== runtime.envelope!.device_id ||
                        me.session.token_family_id !== runtime.envelope!.token_family_id ||
                        me.session.status !== 'active' ||
                        me.session.refresh_generation !== runtime.envelope!.refresh_generation ||
                        me.session.refresh_expires_at_unix !==
                            runtime.envelope!.refresh_expires_at_unix
                      ? 'session_compromised'
                      : null;
            if (identityFailureReason) {
                await pioneerClient.gatewayDisconnect().catch(() => false);
                activeTransportEndpointId = null;
                return { connected, identityFailureReason };
            }
            return { connected, identityFailureReason: null };
        });
        if (handshake.identityFailureReason) {
            await stopFromLifecycle(
                endpoint.id,
                {
                    kind: 'auth_failed',
                    data: { reason: handshake.identityFailureReason },
                },
                runtime,
                new Error('Gateway session identity verification failed'),
            );
        }
        const established = await reduceLifecycle(endpoint.id, {
            kind: 'connection_established',
            data: { generation: connectionGeneration },
        });
        if (runtime.lifecycleEpoch !== lifecycleEpoch) {
            await disconnectMobileGatewayTransport(endpoint.id);
            throw new MobileSessionSuspendedError();
        }
        if (established.effect.kind !== 'switch_connection') {
            throw new Error(`shared lifecycle rejected connection: ${established.effect.kind}`);
        }
        runtime.connectionId = handshake.connected.connection_id;
        clearRuntimeEnvelopeCredential(runtime);
        setPhase(endpoint.id, runtime, 'connected');
        return connectionResult(runtime);
    } catch (error) {
        if (
            error instanceof MobileSessionTerminalError ||
            error instanceof MobileSessionSuspendedError
        ) {
            throw error;
        }
        const codeReason = terminalReasonFromCode(error);
        if (codeReason) {
            await stopFromLifecycle(
                endpoint.id,
                { kind: 'auth_failed', data: { reason: codeReason } },
                runtime,
                error,
            );
        }
        if (replacementClaimedTransport) {
            await disconnectMobileGatewayTransport(endpoint.id);
        }
        const failed = await reduceLifecycle(endpoint.id, {
            kind: 'connection_transport_failed',
            data: { generation: connectionGeneration, now_unix: nowUnix() },
        });
        if (failed.effect.kind === 'begin_refresh') {
            return refreshAfterExpiredConnection(
                endpoint,
                timings,
                runtime,
                installationId,
                lifecycleEpoch,
                failed.effect.data.intent_id,
                expiredConnectionRefreshAttempts,
                error,
            );
        }
        if (failed.effect.kind !== 'retry_connection') {
            throw error;
        }
        runtime.connectionId = null;
        setPhase(endpoint.id, runtime, 'transiently_disconnected');
        throw error;
    }
};

export const suspendMobileGatewaySession = async (endpointId: string): Promise<void> => {
    const runtime = runtimeFor(endpointId);
    runtime.lifecycleEpoch += 1;
    // Access credentials are runtime-only and intentionally do not survive an
    // application background boundary. Foreground reloads the durable refresh
    // envelope and obtains a fresh short-lived access credential.
    clearRuntimeAccess(runtime);
    clearRuntimeEnvelopeCredential(runtime);
    runtime.connectionId = null;
    runtime.connectionGeneration = null;
    if (!runtime.terminalReason) {
        setPhase(endpointId, runtime, 'transiently_disconnected');
    }
    const pending = disconnectMobileGatewayTransport(endpointId);
    runtime.suspendPromise = pending;
    try {
        await pending;
    } finally {
        if (runtime.suspendPromise === pending) {
            runtime.suspendPromise = null;
        }
    }
};

export const markMobileGatewayConnectionDisconnected = (endpointId: string): void => {
    const runtime = runtimeFor(endpointId);
    runtime.lifecycleEpoch += 1;
    runtime.connectionId = null;
    if (activeTransportEndpointId === endpointId) {
        activeTransportEndpointId = null;
    }
    if (!runtime.terminalReason) {
        setPhase(endpointId, runtime, 'transiently_disconnected');
    }
};

export const clearMobileGatewaySessionRuntime = async (endpointId: string): Promise<void> => {
    await suspendMobileGatewaySession(endpointId);
    try {
        await reduceLifecycle(endpointId, { kind: 'no_stored_session' });
    } finally {
        runtimes.delete(endpointId);
    }
};

export const markMobileGatewaySessionTerminal = async (
    endpointId: string,
    reason: SessionTerminalReason,
): Promise<void> => {
    const runtime = runtimeFor(endpointId);
    try {
        await stopFromLifecycle(
            endpointId,
            { kind: 'auth_failed', data: { reason } },
            runtime,
            new Error(reason),
        );
    } catch (error) {
        if (!(error instanceof MobileSessionTerminalError)) {
            throw error;
        }
    }
};

export const mobileSessionRefreshDelayMs = (endpointId: string): number | null => {
    const access = runtimeFor(endpointId).access;
    if (!access) {
        return null;
    }
    return Math.max(
        1,
        (access.accessExpiresAtUnix - MOBILE_ACCESS_REFRESH_LEEWAY_SECONDS - nowUnix()) * 1_000,
    );
};

export const mobileSessionProjection = (endpointId: string): MobileSessionProjection => {
    return projectionFor(runtimeFor(endpointId));
};

export const subscribeMobileSessionProjection = (
    endpointId: string,
    listener: (projection: MobileSessionProjection) => void,
): (() => void) => {
    const endpointListeners = listeners.get(endpointId) ?? new Set();
    endpointListeners.add(listener);
    listeners.set(endpointId, endpointListeners);
    listener(projectionFor(runtimeFor(endpointId)));
    return () => {
        endpointListeners.delete(listener);
        if (endpointListeners.size === 0) {
            listeners.delete(endpointId);
        }
    };
};

const reduceLifecycle = (
    endpointId: string,
    event: Parameters<typeof pioneerClient.gatewaySessionLifecycleReduce>[0]['event'],
): Promise<ClientGatewaySessionLifecycleResult> => {
    return pioneerClient.gatewaySessionLifecycleReduce({ endpoint_id: endpointId, event });
};

const stopFromLifecycle = async (
    endpointId: string,
    event: Parameters<typeof pioneerClient.gatewaySessionLifecycleReduce>[0]['event'],
    runtime: RuntimeSession,
    source: unknown,
): Promise<never> => {
    const stopped = await reduceLifecycle(endpointId, event).catch(() => null);
    const reason =
        stopped?.effect.kind === 'stop'
            ? stopped.effect.data.reason
            : terminalReasonForStopEvent(event);
    if (!reason) {
        throw source;
    }
    runtime.lifecycleEpoch += 1;
    runtime.terminalReason = reason;
    clearRuntimeAccess(runtime);
    runtime.connectionId = null;
    runtime.connectionGeneration = null;
    clearRuntimeEnvelopeCredential(runtime);
    runtime.phase = terminalPhase(reason);
    publish(endpointId, runtime);
    await disconnectMobileGatewayTransport(endpointId);
    throw new MobileSessionTerminalError(reason);
};

const terminalReasonForStopEvent = (
    event: Parameters<typeof pioneerClient.gatewaySessionLifecycleReduce>[0]['event'],
): SessionTerminalReason | null => {
    switch (event.kind) {
        case 'auth_failed':
            return event.data.reason;
        case 'refresh_transport_lost':
            return 'refresh_outcome_unknown';
        case 'secure_storage_failed':
            return 'secure_storage_failed';
        default:
            return null;
    }
};

const metadata = (envelope: MobileGatewaySessionEnvelope) => ({
    gateway_id: envelope.gateway_id,
    device_id: envelope.device_id,
    session_id: envelope.session_id,
    refresh_generation: envelope.refresh_generation,
    refresh_expires_at_unix: envelope.refresh_expires_at_unix,
});

const setRuntimeEnvelope = (
    runtime: RuntimeSession,
    envelope: MobileGatewaySessionEnvelope,
): void => {
    if (runtime.envelope && runtime.envelope !== envelope) {
        runtime.envelope.refresh_token = '';
    }
    runtime.envelope = envelope;
    runtime.displayMetadata = metadata(envelope);
};

const setRuntimeAccess = (runtime: RuntimeSession, access: MobileSessionEphemeralAccess): void => {
    if (runtime.access && runtime.access !== access) {
        runtime.access.accessToken = '';
    }
    runtime.access = access;
};

const clearRuntimeAccess = (runtime: RuntimeSession): void => {
    if (runtime.access) {
        runtime.access.accessToken = '';
        runtime.access = null;
    }
};

const clearRuntimeEnvelopeCredential = (runtime: RuntimeSession): void => {
    if (runtime.envelope) {
        runtime.displayMetadata = metadata(runtime.envelope);
        runtime.envelope.refresh_token = '';
    }
};

const validateRefreshGrant = (
    current: MobileGatewaySessionEnvelope,
    installationId: string,
    grant: AuthRefreshGrant,
): void => {
    if (
        grant.auth_protocol_version !== DEVICE_SESSION_AUTH_PROTOCOL_VERSION ||
        grant.credential_storage_order !== 'persist_refresh_before_activating_access' ||
        grant.gateway.id !== current.gateway_id ||
        grant.principal.id !== current.principal_id ||
        grant.principal.kind !== 'superuser' ||
        grant.session.id !== current.session_id ||
        grant.session.device_id !== current.device_id ||
        grant.session.token_family_id !== current.token_family_id ||
        grant.device.id !== current.device_id ||
        grant.device.installation_id !== installationId ||
        grant.device.installation_id !== current.installation_id ||
        grant.device.client_kind !== 'mobile' ||
        grant.device.status !== 'active' ||
        grant.session.status !== 'active' ||
        !/^[A-Za-z0-9]{21}$/.test(grant.session.token_family_id) ||
        !Number.isSafeInteger(grant.refresh_generation) ||
        current.refresh_generation >= Number.MAX_SAFE_INTEGER ||
        grant.refresh_generation !== current.refresh_generation + 1 ||
        grant.session.refresh_generation !== grant.refresh_generation ||
        grant.refresh_expires_at_unix !== grant.session.refresh_expires_at_unix ||
        !Number.isSafeInteger(grant.refresh_expires_at_unix) ||
        grant.refresh_expires_at_unix <= 0 ||
        !Number.isSafeInteger(grant.access_expires_at_unix) ||
        grant.access_expires_at_unix <= 0 ||
        !isRefreshCredential(grant.refresh_token) ||
        !grant.access_token
    ) {
        throw new Error('invalid rotated Gateway session grant');
    }
};

const terminalReasonForRefreshError = (error: unknown): SessionTerminalReason => {
    return terminalReasonFromCode(error) ?? 'refresh_outcome_unknown';
};

const isRefreshRequestKnownNotDispatched = (error: unknown): boolean => {
    return (
        error instanceof PioneerClientNativeError &&
        error.code === AUTH_EXCHANGE_TRANSPORT_BEFORE_REQUEST_CODE
    );
};

export const terminalReasonFromMachineCode = (
    code: string | null | undefined,
): SessionTerminalReason | null => {
    switch (code) {
        case 'session_revoked':
            return 'session_revoked';
        case 'session_expired':
            return 'session_expired';
        case 'session_compromised':
            return 'session_compromised';
        case 'gateway_identity_mismatch':
            return 'gateway_identity_mismatch';
        case 'authentication_required':
            return 'authentication_required';
        case 'invalid_credential':
        case 'auth_credential_method_mismatch':
            return 'refresh_credential_invalid';
        case 'invalid_auth_endpoint':
            return 'gateway_identity_mismatch';
        default:
            return null;
    }
};

const terminalReasonFromCode = (error: unknown): SessionTerminalReason | null => {
    if (!(error instanceof PioneerClientNativeError)) {
        return null;
    }
    return terminalReasonFromMachineCode(error.code);
};

const projectionFor = (runtime: RuntimeSession): MobileSessionProjection => ({
    phase: runtime.phase,
    deviceId: runtime.displayMetadata?.device_id ?? null,
    sessionId: runtime.displayMetadata?.session_id ?? null,
    accessExpiresAtUnix: runtime.access?.accessExpiresAtUnix ?? null,
    terminalReason: runtime.terminalReason,
    connectionGeneration: runtime.connectionGeneration,
});

const terminalPhase = (reason: SessionTerminalReason): MobileSessionLifecyclePhase => {
    switch (reason) {
        case 'authentication_required':
            return 'needs_authentication';
        case 'session_revoked':
            return 'revoked';
        case 'session_expired':
        case 'refresh_credential_invalid':
            return 'expired';
        case 'session_compromised':
        case 'refresh_outcome_unknown':
            return 'compromised';
        case 'gateway_identity_mismatch':
            return 'gateway_mismatch';
        case 'secure_storage_failed':
            return 'storage_failed';
    }
};

const connectionResult = (runtime: RuntimeSession): MobileGatewayConnection => {
    if (runtime.connectionId === null) {
        throw new Error('mobile Gateway session is not connected');
    }
    return { connection_id: runtime.connectionId, projection: projectionFor(runtime) };
};

const nowUnix = (): number => Math.floor(Date.now() / 1_000);

const randomRequestId = (): string => `Q${nanoid(20)}`;

export const resetMobileSessionCoordinatorForTests = (): void => {
    for (const runtime of runtimes.values()) {
        clearRuntimeAccess(runtime);
        clearRuntimeEnvelopeCredential(runtime);
    }
    runtimes.clear();
    inFlight.clear();
    listeners.clear();
    transportBarrier = Promise.resolve();
    activeTransportEndpointId = null;
};

const withMobileGatewayTransport = async <T>(operation: () => Promise<T>): Promise<T> => {
    const predecessor = transportBarrier;
    let release!: () => void;
    transportBarrier = new Promise<void>((resolve) => {
        release = resolve;
    });
    await predecessor;
    try {
        return await operation();
    } finally {
        release();
    }
};

const disconnectMobileGatewayTransport = async (endpointId: string): Promise<void> => {
    await withMobileGatewayTransport(async () => {
        if (activeTransportEndpointId !== endpointId) {
            return;
        }
        activeTransportEndpointId = null;
        await pioneerClient.gatewayDisconnect().catch(() => false);
    });
};

const markTransportSuperseded = (endpointId: string): void => {
    const runtime = runtimes.get(endpointId);
    if (!runtime) {
        return;
    }
    runtime.lifecycleEpoch += 1;
    runtime.connectionId = null;
    runtime.connectionGeneration = null;
    clearRuntimeAccess(runtime);
    clearRuntimeEnvelopeCredential(runtime);
    if (!runtime.terminalReason) {
        setPhase(endpointId, runtime, 'transiently_disconnected');
    }
};

const setPhase = (
    endpointId: string,
    runtime: RuntimeSession,
    phase: MobileSessionLifecyclePhase,
): void => {
    runtime.phase = phase;
    publish(endpointId, runtime);
};

const publish = (endpointId: string, runtime: RuntimeSession): void => {
    for (const listener of listeners.get(endpointId) ?? []) {
        listener(projectionFor(runtime));
    }
};

import { PioneerClientNativeError, pioneerClient, mobileClientBinding } from '@/client';
import type { ClientGatewayWsTimings, GatewayEndpoint, SessionTerminalReason } from '@/client';
import type { GatewaySessionPublication } from '@/client/generated/gateway_session_publication';
import type { IdentityAuthorizationPublication } from '@/client/generated/identity_authorization_publication';
import { useGatewayStore } from '@/stores/gateway';

export const MOBILE_ACCESS_REFRESH_LEEWAY_SECONDS = 60;

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
    principalId: string | null;
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

export type MobileSessionDiagnosticStage =
    | 'authorization.registry.load'
    | 'authorization.credentials.load'
    | 'authorization.refresh_intent.persist'
    | 'authorization.refresh.request'
    | 'authorization.credentials.persist'
    | 'gateway_session.connect_attempt'
    | 'gateway_session.identity_verify';

export type MobileSessionDiagnosticEvent = {
    stage: MobileSessionDiagnosticStage;
    outcome: 'started' | 'succeeded' | 'failed';
    timing?: { started_at_unix_ms: number; duration_ms: number };
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

const diagnosticListeners = new Map<string, Set<(event: MobileSessionDiagnosticEvent) => void>>();
const publishDiagnostic = (
    endpointId: string,
    stage: MobileSessionDiagnosticStage,
    outcome: MobileSessionDiagnosticEvent['outcome'],
): void => {
    for (const listener of diagnosticListeners.get(endpointId) ?? []) {
        try {
            listener({ stage, outcome });
        } catch {
            /* Diagnostics do not change a session result. */
        }
    }
};

export const gatewaySessionPublication = (): GatewaySessionPublication | null =>
    mobileClientBinding.scope({ kind: 'session' }).getSnapshot()
        ?.payload as GatewaySessionPublication | null;
const identityPublication = (): IdentityAuthorizationPublication | null =>
    mobileClientBinding.scope({ kind: 'administration', workspace_id: null }).getSnapshot()
        ?.payload as IdentityAuthorizationPublication | null;

const ensureSession = async (
    endpoint: GatewayEndpoint,
    timings: ClientGatewayWsTimings,
    rejectedConnectionId?: number,
): Promise<MobileGatewayConnection> => {
    // Register immutable selectors before requesting work so ordered delivery can install both scopes.
    gatewaySessionPublication();
    identityPublication();
    publishDiagnostic(endpoint.id, 'authorization.registry.load', 'started');
    let installationId: string;
    try {
        installationId = useGatewayStore.getState().registry.installation_id?.trim() ?? '';
        if (!installationId) {
            throw new Error('Gateway installation identity is missing');
        }
        publishDiagnostic(endpoint.id, 'authorization.registry.load', 'succeeded');
    } catch {
        publishDiagnostic(endpoint.id, 'authorization.registry.load', 'failed');
        await markMobileGatewaySessionTerminal(endpoint.id, 'secure_storage_failed');
        throw new MobileSessionTerminalError('secure_storage_failed');
    }
    try {
        const result = await pioneerClient.gatewaySessionEnsure({
            endpoint,
            timings,
            installation_id: installationId,
            rejected_connection_id: rejectedConnectionId,
        });
        await mobileClientBinding.synchronize();
        const projection = mobileSessionProjection(endpoint.id);
        const connected = gatewaySessionPublication()?.connections[endpoint.id]?.connected;
        if (connected?.connection_id !== result.connection_id) {
            throw new MobileSessionSuspendedError();
        }
        return { connection_id: result.connection_id, projection };
    } catch (error) {
        await mobileClientBinding.synchronize();
        const reason = mobileSessionProjection(endpoint.id).terminalReason;
        if (reason) {
            throw new MobileSessionTerminalError(reason);
        }
        if (error instanceof PioneerClientNativeError && error.code === 'session_suspended') {
            throw new MobileSessionSuspendedError();
        }
        throw error;
    }
};

export const ensureMobileGatewaySession = (
    endpoint: GatewayEndpoint,
    timings: ClientGatewayWsTimings,
): Promise<MobileGatewayConnection> => ensureSession(endpoint, timings);
export const refreshMobileGatewaySessionAfterUnauthorized = (
    endpoint: GatewayEndpoint,
    timings: ClientGatewayWsTimings,
    rejectedConnectionGeneration: number,
): Promise<MobileGatewayConnection> =>
    ensureSession(endpoint, timings, rejectedConnectionGeneration);

export const suspendMobileGatewaySession = async (endpointId: string): Promise<void> => {
    await pioneerClient.gatewaySessionControl({ kind: 'suspend', endpoint_id: endpointId });
    await mobileClientBinding.synchronize();
};
export const clearMobileGatewaySessionRuntime = async (endpointId: string): Promise<void> => {
    await pioneerClient.gatewaySessionControl({ kind: 'clear', endpoint_id: endpointId });
    await mobileClientBinding.synchronize();
};
export const markMobileGatewaySessionTerminal = async (
    endpointId: string,
    reason: SessionTerminalReason,
): Promise<void> => {
    await pioneerClient.gatewaySessionControl({ kind: 'stop', endpoint_id: endpointId, reason });
    await mobileClientBinding.synchronize();
};
export const markMobileGatewayConnectionDisconnected = (endpointId: string): void => {
    void pioneerClient
        .gatewaySessionControl({ kind: 'disconnected', endpoint_id: endpointId })
        .then(() => mobileClientBinding.synchronize())
        .catch(() => undefined);
};

export const mobileSessionRefreshDelayMs = (endpointId: string): number | null => {
    const publication = gatewaySessionPublication();
    if (!publication?.connections[endpointId]?.connected) {
        return null;
    }
    const expires = publication.access_expiries[endpointId];
    return expires === undefined
        ? null
        : Math.max(
              1,
              (expires - MOBILE_ACCESS_REFRESH_LEEWAY_SECONDS - Math.floor(Date.now() / 1000)) *
                  1000,
          );
};

export const mobileSessionReconnectDelayMs = (endpointId: string): number | null =>
    gatewaySessionPublication()?.connections[endpointId]?.retry_delay_ms ?? null;

const terminalPhase = (reason: SessionTerminalReason): MobileSessionLifecyclePhase => {
    switch (reason) {
        case 'session_revoked':
        case 'principal_suspended':
        case 'principal_removed':
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
        case 'authentication_required':
            return 'needs_authentication';
    }
};

export const mobileSessionProjection = (endpointId: string): MobileSessionProjection => {
    const publication = gatewaySessionPublication();
    const lifecycle = publication?.sessions[endpointId];
    const connection = publication?.connections[endpointId];
    const auth = identityPublication()?.current_auth;
    const reason = lifecycle?.kind === 'terminal' ? lifecycle.data.reason : null;
    const metadata =
        !lifecycle ||
        lifecycle.kind === 'no_session' ||
        lifecycle.kind === 'needs_device_activation'
            ? null
            : lifecycle.data.metadata;
    let phase: MobileSessionLifecyclePhase = 'needs_authentication';
    if (reason) {
        phase = terminalPhase(reason);
    } else if (connection?.connected) {
        phase = 'connected';
    } else if (connection?.failure) {
        phase = 'transiently_disconnected';
    } else if (lifecycle?.kind === 'connecting') {
        phase = 'connecting';
    } else if (lifecycle?.kind === 'refreshing' || lifecycle?.kind === 'awaiting_secure_storage') {
        phase = 'refreshing';
    } else if (lifecycle?.kind === 'active') {
        phase = 'transiently_disconnected';
    } else if (connection?.pending) {
        phase = 'loading_session';
    }
    return {
        phase,
        principalId: auth && auth.session.id === metadata?.session_id ? auth.principal.id : null,
        deviceId: metadata?.device_id ?? null,
        sessionId: metadata?.session_id ?? null,
        accessExpiresAtUnix: connection?.connected?.access_expires_at_unix ?? null,
        terminalReason: reason,
        connectionGeneration: connection?.connected?.connection_id ?? null,
    };
};

export const subscribeMobileSessionProjection = (
    endpointId: string,
    listener: (projection: MobileSessionProjection) => void,
): (() => void) => {
    let previous = mobileSessionProjection(endpointId);
    listener(previous);
    const changed = () => {
        const next = mobileSessionProjection(endpointId);
        if (
            (Object.keys(next) as (keyof MobileSessionProjection)[]).every(
                (key) => next[key] === previous[key],
            )
        ) {
            return;
        }
        previous = next;
        listener(next);
    };
    const session = mobileClientBinding.scope({ kind: 'session' }).subscribe(changed);
    const identity = mobileClientBinding
        .scope({ kind: 'administration', workspace_id: null })
        .subscribe(changed);
    return () => {
        session();
        identity();
    };
};

const sessionDiagnosticNames: Record<string, MobileSessionDiagnosticStage> = {
    credentials_load: 'authorization.credentials.load',
    refresh_intent_persist: 'authorization.refresh_intent.persist',
    refresh_request: 'authorization.refresh.request',
    credentials_persist: 'authorization.credentials.persist',
    connect_attempt: 'gateway_session.connect_attempt',
    identity_verify: 'gateway_session.identity_verify',
};

export const subscribeMobileSessionDiagnostics = (
    endpointId: string,
    listener: (event: MobileSessionDiagnosticEvent) => void,
): (() => void) => {
    const listeners = diagnosticListeners.get(endpointId) ?? new Set();
    listeners.add(listener);
    diagnosticListeners.set(endpointId, listeners);
    const delivered = new Map<string, string>();
    const unsubscribe = mobileClientBinding.scope({ kind: 'session' }).subscribe(() => {
        for (const [key, timing] of Object.entries(
            gatewaySessionPublication()?.startup?.session_diagnostics ?? {},
        )) {
            const stage = sessionDiagnosticNames[key];
            if (
                !stage ||
                timing.endpoint_id !== endpointId ||
                delivered.get(key) === timing.state
            ) {
                continue;
            }
            delivered.set(key, timing.state);
            try {
                if (timing.state === 'pending') {
                    listener({ stage, outcome: 'started' });
                } else if (timing.duration_ms !== null && timing.duration_ms !== undefined) {
                    listener({
                        stage,
                        outcome: timing.state === 'succeeded' ? 'succeeded' : 'failed',
                        timing: {
                            started_at_unix_ms: timing.started_at_unix_ms,
                            duration_ms: timing.duration_ms,
                        },
                    });
                }
            } catch {
                /* Diagnostics cannot interrupt publication delivery. */
            }
        }
    });
    return () => {
        unsubscribe();
        listeners.delete(listener);
        if (!listeners.size) {
            diagnosticListeners.delete(endpointId);
        }
    };
};
export const resetMobileSessionCoordinatorForTests = (): void => {
    diagnosticListeners.clear();
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
        case 'principal_suspended':
            return 'principal_suspended';
        case 'principal_removed':
            return 'principal_removed';
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

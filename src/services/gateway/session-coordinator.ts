import { mobileClientBinding } from '@/client';
import type { SessionTerminalReason } from '@/client';
import type { GatewaySessionPublication } from '@/client/generated/gateway_session_publication';
import type { IdentityAuthorizationPublication } from '@/client/generated/identity_authorization_publication';

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

export const gatewaySessionPublication = (): GatewaySessionPublication | null =>
    mobileClientBinding.scope({ kind: 'session' }).getSnapshot()
        ?.payload as GatewaySessionPublication | null;
const identityPublication = (): IdentityAuthorizationPublication | null =>
    mobileClientBinding.scope({ kind: 'administration', workspace_id: null }).getSnapshot()
        ?.payload as IdentityAuthorizationPublication | null;

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
    };
};

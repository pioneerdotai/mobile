import { pioneerClient } from '@/client';
import type {
    AuthSessionGrant,
    ClientDeviceActivationParseResult,
    ClientDeviceActivationPresentationResult,
    GatewayEndpoint,
    GatewayRegistry,
} from '@/client';
import { storage } from '@/storage';
import {
    findGatewayEndpoint,
    loadGatewayRegistry,
    replaceGatewayEndpoint,
    saveGatewayRegistry,
} from './registry';
import {
    cleanupIssuedMobileSession,
    mobileAuthInstallation,
    mobileSessionEnvelopeFromGrant,
    redactMobileSessionGrant,
    validateMobileSessionGrant,
} from './session-grant';
import {
    clearMobileGatewaySessionRuntime,
    markMobileGatewaySessionTerminal,
} from './session-coordinator';
import {
    deleteMobileGatewaySession,
    readMobileGatewaySession,
    writeMobileGatewaySession,
} from './session-storage';
import type { MobileGatewaySessionEnvelope } from './session-storage';
import { normalizeDeviceActivationCode } from './device-activation-code';

const DEVICE_ACTIVATION_TIMEOUT_MS = 15_000;
const DEVICE_ACTIVATION_COMMIT_STORAGE_PREFIX = 'pioneer.gateway.device-activation-commit.v1.';
const PENDING_DEVICE_ACTIVATION_ENDPOINT_KEYS = new Set([
    'id',
    'name',
    'address',
    'kind',
    'session_ref',
    'server_gateway_id',
    'service_name',
    'workspace_id',
]);
const PENDING_DEVICE_ACTIVATION_COMMIT_KEYS = new Set([
    'schema_version',
    'gateway_id',
    'endpoint_id',
    'session_ref',
    'endpoint',
    'previous_session_id',
]);

type PendingDeviceActivationCommit = {
    schema_version: 1;
    gateway_id: string;
    endpoint_id: string;
    session_ref: string;
    endpoint: GatewayEndpoint;
    previous_session_id: string | null;
};

type DeviceActivationBinding = {
    gatewayId: string;
    endpointId: string;
    sessionRef: string;
    endpoint: GatewayEndpoint;
};

export type MobileDeviceActivationErrorCode =
    'invalid_presentation' | 'gateway_mismatch' | 'activation_failed' | 'storage_failed';

export class MobileDeviceActivationError extends Error {
    readonly code: MobileDeviceActivationErrorCode;

    constructor(code: MobileDeviceActivationErrorCode, cause?: unknown) {
        super(code);
        this.name = 'MobileDeviceActivationError';
        this.code = code;
        this.cause = cause;
    }
}

export type MobileDeviceActivationInput = {
    protected_endpoint: string;
    activation_code: string;
    gateway_id?: string | null;
};

export const parseMobileDeviceActivationUri = async (
    uri: string,
): Promise<MobileDeviceActivationInput> => {
    try {
        const parsed = await pioneerClient.gatewayDeviceActivationParse({ uri });
        return activationInput(parsed);
    } catch (error) {
        throw new MobileDeviceActivationError('invalid_presentation', error);
    }
};

export const validateMobileDeviceActivationPin = (
    activation: MobileDeviceActivationInput,
    pinnedGatewayId: string | null | undefined,
): void => {
    const presentationGatewayId = normalizedGatewayId(activation.gateway_id);
    if (activation.gateway_id != null && !presentationGatewayId) {
        throw new MobileDeviceActivationError('invalid_presentation');
    }
    const pinned = normalizedGatewayId(pinnedGatewayId);
    if (pinnedGatewayId != null && !pinned) {
        throw new MobileDeviceActivationError('gateway_mismatch');
    }
    if (presentationGatewayId && pinned && presentationGatewayId !== pinned) {
        throw new MobileDeviceActivationError('gateway_mismatch');
    }
};

export const createMobileDeviceActivationPresentation = async (
    endpoint: GatewayEndpoint,
): Promise<ClientDeviceActivationPresentationResult> => {
    const createdDevice = await pioneerClient.gatewayAuthDeviceCreate();
    return pioneerClient.gatewayDeviceActivationPresentation({
        protected_endpoint: endpoint.address,
        created_device: createdDevice,
    });
};

export const cancelMobileDeviceActivation = async (sessionId: string): Promise<void> => {
    await pioneerClient.gatewayAuthSessionRevoke({
        session_id: sessionId,
        expected_status: 'pending',
    });
};

export const acceptMobileDeviceActivation = async (
    activation: MobileDeviceActivationInput,
    pinnedGatewayId?: string | null,
): Promise<{ endpoint: GatewayEndpoint; registry: GatewayRegistry }> => {
    const activationCode = validateManualDeviceActivationInput(activation);
    validateMobileDeviceActivationPin(activation, pinnedGatewayId);
    const registry = loadGatewayRegistry();
    const installationId = registry.installation_id?.trim();
    if (!installationId) {
        throw new MobileDeviceActivationError('storage_failed');
    }
    const addressEndpoint = endpointForActivationAddress(registry, activation.protected_endpoint);
    let expectedGatewayId =
        normalizedGatewayId(activation.gateway_id) ?? normalizedGatewayId(pinnedGatewayId);
    if (addressEndpoint?.server_gateway_id) {
        if (expectedGatewayId && expectedGatewayId !== addressEndpoint.server_gateway_id) {
            throw new MobileDeviceActivationError('gateway_mismatch');
        }
        expectedGatewayId = addressEndpoint.server_gateway_id;
    }

    let binding: DeviceActivationBinding | null = expectedGatewayId
        ? deviceActivationBinding(registry, expectedGatewayId, activation.protected_endpoint)
        : null;
    let storedEnvelope: MobileGatewaySessionEnvelope | null = null;
    let pendingCommit: PendingDeviceActivationCommit | null = null;
    if (binding) {
        try {
            storedEnvelope = await readMobileGatewaySession(binding.sessionRef);
            pendingCommit = readPendingDeviceActivationCommit(binding.gatewayId);
        } catch (error) {
            throw new MobileDeviceActivationError('storage_failed', error);
        }
        if (storedEnvelope && storedEnvelope.gateway_id !== binding.gatewayId) {
            throw new MobileDeviceActivationError('gateway_mismatch');
        }
        const recovered = await recoverPreparedDeviceActivation(
            registry,
            binding,
            pendingCommit,
            storedEnvelope,
            installationId,
            activation.protected_endpoint,
        );
        if (recovered) {
            return recovered;
        }
        pendingCommit = pendingCommitForBinding(binding, storedEnvelope);
        try {
            writePendingDeviceActivationCommit(pendingCommit);
        } catch (error) {
            throw new MobileDeviceActivationError('storage_failed', error);
        }
    }

    let grant: AuthSessionGrant | null = null;
    try {
        grant = await pioneerClient.gatewayAuthDeviceActivate({
            address: activation.protected_endpoint,
            credential: activationCode,
            params: {
                installation: mobileAuthInstallation(installationId),
            },
            timeout_ms: DEVICE_ACTIVATION_TIMEOUT_MS,
        });
    } catch (error) {
        if (expectedGatewayId) {
            clearPendingDeviceActivationCommitBestEffort(expectedGatewayId);
        }
        throw new MobileDeviceActivationError('activation_failed', error);
    }

    try {
        validateMobileSessionGrant(grant, installationId, expectedGatewayId);
    } catch (error) {
        await cleanupDeviceActivationSession(activation.protected_endpoint, grant);
        if (expectedGatewayId) {
            clearPendingDeviceActivationCommitBestEffort(expectedGatewayId);
        }
        redactMobileSessionGrant(grant);
        throw new MobileDeviceActivationError('gateway_mismatch', error);
    }

    const gatewayId = grant.gateway.id;
    binding = deviceActivationBinding(registry, gatewayId, activation.protected_endpoint);
    if (!pendingCommit || pendingCommit.gateway_id !== gatewayId) {
        try {
            storedEnvelope = await readMobileGatewaySession(binding.sessionRef);
            if (storedEnvelope && storedEnvelope.gateway_id !== gatewayId) {
                throw new MobileDeviceActivationError('gateway_mismatch');
            }
            pendingCommit = pendingCommitForBinding(binding, storedEnvelope);
            writePendingDeviceActivationCommit(pendingCommit);
        } catch (error) {
            await cleanupDeviceActivationSession(activation.protected_endpoint, grant);
            clearPendingDeviceActivationCommitBestEffort(gatewayId);
            redactMobileSessionGrant(grant);
            if (error instanceof MobileDeviceActivationError) {
                throw error;
            }
            throw new MobileDeviceActivationError('storage_failed', error);
        }
    }

    const envelope = mobileSessionEnvelopeFromGrant(grant);
    let sessionDurable = false;
    let registryDurable = false;
    let nextRegistry: GatewayRegistry | null = null;

    try {
        await writeMobileGatewaySession(binding.sessionRef, envelope);
        sessionDurable = true;
        nextRegistry = upsertActivatedEndpoint(registry, binding.endpoint);
        saveGatewayRegistry(nextRegistry);
        registryDurable = true;
        clearPendingDeviceActivationCommit(gatewayId);
        await clearMobileGatewaySessionRuntime(binding.endpoint.id).catch(() => undefined);
        redactMobileSessionGrant(grant);
        grant = null;
        return { endpoint: binding.endpoint, registry: nextRegistry };
    } catch (error) {
        if (registryDurable && nextRegistry) {
            // The endpoint and refresh envelope are already a complete,
            // usable v2 binding. Keep the credential-free pending marker so
            // startup can finish removing the journal without reporting a
            // failed activation that actually succeeded.
            await clearMobileGatewaySessionRuntime(binding.endpoint.id).catch(() => undefined);
            redactMobileSessionGrant(grant);
            grant = null;
            return { endpoint: binding.endpoint, registry: nextRegistry };
        }
        if (grant && !sessionDurable) {
            await cleanupDeviceActivationSession(activation.protected_endpoint, grant);
            clearPendingDeviceActivationCommitBestEffort(gatewayId);
        }
        redactMobileSessionGrant(grant);
        throw new MobileDeviceActivationError('storage_failed', error);
    }
};

/**
 * Resume only the credential-free tail of an activation commit.
 *
 * The pending MMKV record never contains access/refresh/activation material. It
 * remains until the v2 registry binding is durable and the journal itself is
 * removed. Recovery is best-effort per endpoint so one unavailable
 * SecureStore item cannot block app startup.
 */
export const recoverPendingMobileDeviceActivationCommits = async (): Promise<GatewayRegistry> => {
    let registry = loadGatewayRegistry();
    const installationId = registry.installation_id?.trim();
    if (!installationId) {
        return registry;
    }
    let pendingGatewayIds: string[];
    try {
        pendingGatewayIds = storage
            .getAllKeys()
            .filter((key) => key.startsWith(DEVICE_ACTIVATION_COMMIT_STORAGE_PREFIX))
            .map((key) => key.slice(DEVICE_ACTIVATION_COMMIT_STORAGE_PREFIX.length))
            .filter((gatewayId) => /^[A-Za-z0-9]{21}$/.test(gatewayId));
    } catch {
        return registry;
    }

    for (const gatewayId of pendingGatewayIds) {
        let pending: PendingDeviceActivationCommit | null;
        try {
            pending = readPendingDeviceActivationCommit(gatewayId);
        } catch {
            // A single unreadable MMKV journal must not prevent the remaining
            // endpoints from hydrating. Keep it intact for a later retry.
            continue;
        }
        if (!pending) {
            continue;
        }
        const existing = findGatewayEndpoint(registry, pending.endpoint_id);
        if (
            existing &&
            (canonicalEndpointKey(existing.address) !==
                canonicalEndpointKey(pending.endpoint.address) ||
                existing.kind !== pending.endpoint.kind ||
                (existing.server_gateway_id != null &&
                    existing.server_gateway_id !== pending.gateway_id) ||
                (existing.session_ref != null && existing.session_ref !== pending.session_ref))
        ) {
            continue;
        }
        const recoverableEndpoint = existing ?? pending.endpoint;
        let envelope: MobileGatewaySessionEnvelope | null;
        try {
            envelope = await readMobileGatewaySession(pending.session_ref);
        } catch {
            continue;
        }
        if (!isRecoverableDeviceActivationEnvelope(pending, envelope, installationId)) {
            continue;
        }
        const endpoint: GatewayEndpoint = {
            ...recoverableEndpoint,
            session_ref: pending.session_ref,
            server_gateway_id: pending.gateway_id,
        };
        const recoveredRegistry = upsertActivatedEndpoint(registry, endpoint);
        try {
            saveGatewayRegistry(recoveredRegistry);
            registry = recoveredRegistry;
            clearPendingDeviceActivationCommit(pending.gateway_id);
        } catch {
            // Keep the journal intact so the credential-free commit can be
            // retried at the next hydration.
        }
    }

    return registry;
};

const cleanupDeviceActivationSession = async (
    address: string,
    grant: AuthSessionGrant,
): Promise<void> => cleanupIssuedMobileSession(address, grant, DEVICE_ACTIVATION_TIMEOUT_MS);

export const listMobileGatewaySessions = async () => {
    const response = await pioneerClient.gatewayAuthSessionList();
    return {
        ...response,
        sessions: response.sessions.filter(
            (item) => item.session.status === 'active' && item.device.status === 'active',
        ),
    };
};

export const revokeMobileGatewaySession = async (
    endpointId: string,
    sessionId: string,
    current: boolean,
): Promise<void> => {
    await pioneerClient.gatewayAuthSessionRevoke({ session_id: sessionId });
    if (!current) {
        return;
    }
    const endpoint = findGatewayEndpoint(loadGatewayRegistry(), endpointId);
    let deletionError: unknown = null;
    if (endpoint?.session_ref) {
        try {
            await deleteMobileGatewaySession(endpoint.session_ref);
        } catch (error) {
            deletionError = error;
        }
    }
    await markMobileGatewaySessionTerminal(endpointId, 'session_revoked');
    if (deletionError) {
        throw new MobileDeviceActivationError('storage_failed', deletionError);
    }
};

export const logoutMobileGatewaySession = async (endpoint: GatewayEndpoint): Promise<void> => {
    await pioneerClient.gatewayAuthLogout();
    let deletionError: unknown = null;
    if (endpoint.session_ref) {
        try {
            await deleteMobileGatewaySession(endpoint.session_ref);
        } catch (error) {
            deletionError = error;
        }
    }
    await markMobileGatewaySessionTerminal(endpoint.id, 'session_revoked');
    if (deletionError) {
        throw new MobileDeviceActivationError('storage_failed', deletionError);
    }
};

const activationInput = (
    parsed: ClientDeviceActivationParseResult,
): MobileDeviceActivationInput => ({
    protected_endpoint: parsed.protected_endpoint,
    activation_code: parsed.activation_code,
    gateway_id: parsed.gateway_id,
});

const validateManualDeviceActivationInput = (activation: MobileDeviceActivationInput): string => {
    const activationCode = normalizeDeviceActivationCode(activation.activation_code);
    if (!activationCode) {
        throw new MobileDeviceActivationError('invalid_presentation');
    }
    if (!isProtectedDeviceActivationEndpoint(activation.protected_endpoint)) {
        throw new MobileDeviceActivationError('invalid_presentation');
    }
    if (activation.gateway_id != null && !normalizedGatewayId(activation.gateway_id)) {
        throw new MobileDeviceActivationError('invalid_presentation');
    }
    return activationCode;
};

const normalizedGatewayId = (value: string | null | undefined): string | null => {
    const normalized = value?.trim() ?? '';
    return /^[A-Za-z0-9]{21}$/.test(normalized) ? normalized : null;
};

const isProtectedDeviceActivationEndpoint = (value: string): boolean => {
    try {
        const endpoint = new URL(value);
        const plaintextLoopback =
            endpoint.protocol === 'ws:' && isLoopbackHostname(endpoint.hostname);
        return (
            value === value.trim() &&
            value.length <= 2_048 &&
            (endpoint.protocol === 'wss:' || plaintextLoopback) &&
            Boolean(endpoint.hostname) &&
            !endpoint.username &&
            !endpoint.password &&
            !endpoint.hash
        );
    } catch {
        return false;
    }
};

const isLoopbackHostname = (hostname: string): boolean => {
    const normalized = hostname.toLowerCase();
    return (
        normalized === 'localhost' ||
        normalized === '127.0.0.1' ||
        normalized === '[::1]' ||
        normalized === '::1'
    );
};

const endpointForDeviceActivation = (
    registry: GatewayRegistry,
    gatewayId: string,
    protectedEndpoint: string,
): GatewayEndpoint | null => {
    const all = [registry.local, ...(registry.remotes ?? [])].filter(
        (candidate): candidate is GatewayEndpoint => Boolean(candidate),
    );
    const endpointKey = canonicalEndpointKey(protectedEndpoint);
    const addressMatch = all.find(
        (candidate) =>
            endpointKey !== null && canonicalEndpointKey(candidate.address) === endpointKey,
    );
    const gatewayMatch = all.find((candidate) => candidate.server_gateway_id === gatewayId) ?? null;
    if (addressMatch?.server_gateway_id && addressMatch.server_gateway_id !== gatewayId) {
        throw new MobileDeviceActivationError('gateway_mismatch');
    }
    if (gatewayMatch && addressMatch && gatewayMatch.id !== addressMatch.id) {
        throw new MobileDeviceActivationError('gateway_mismatch');
    }
    return gatewayMatch ?? addressMatch ?? null;
};

const endpointForActivationAddress = (
    registry: GatewayRegistry,
    protectedEndpoint: string,
): GatewayEndpoint | null => {
    const endpointKey = canonicalEndpointKey(protectedEndpoint);
    if (!endpointKey) {
        return null;
    }
    return (
        [registry.local, ...(registry.remotes ?? [])]
            .filter((candidate): candidate is GatewayEndpoint => Boolean(candidate))
            .find((candidate) => canonicalEndpointKey(candidate.address) === endpointKey) ?? null
    );
};

const deviceActivationBinding = (
    registry: GatewayRegistry,
    gatewayId: string,
    protectedEndpoint: string,
): DeviceActivationBinding => {
    const existing = endpointForDeviceActivation(registry, gatewayId, protectedEndpoint);
    const endpointId = existing?.id ?? `activated-${gatewayId}`;
    const sessionRef = existing?.session_ref?.trim() || endpointId;
    return {
        gatewayId,
        endpointId,
        sessionRef,
        endpoint: {
            id: endpointId,
            name: existing?.name ?? 'Activated Gateway',
            address: protectedEndpoint,
            // Preserve the role of an endpoint already known to the registry.
            // Converting an existing local endpoint to remote would violate
            // the v2 registry contract.
            kind: existing?.kind ?? 'remote',
            session_ref: sessionRef,
            server_gateway_id: gatewayId,
            service_name: existing?.service_name ?? null,
            workspace_id: existing?.workspace_id ?? null,
        },
    };
};

const pendingCommitForBinding = (
    binding: DeviceActivationBinding,
    storedEnvelope: MobileGatewaySessionEnvelope | null,
): PendingDeviceActivationCommit => ({
    schema_version: 1,
    gateway_id: binding.gatewayId,
    endpoint_id: binding.endpointId,
    session_ref: binding.sessionRef,
    endpoint: binding.endpoint,
    previous_session_id: storedEnvelope?.session_id ?? null,
});

const recoverPreparedDeviceActivation = async (
    registry: GatewayRegistry,
    binding: DeviceActivationBinding,
    pendingCommit: PendingDeviceActivationCommit | null,
    storedEnvelope: MobileGatewaySessionEnvelope | null,
    installationId: string,
    protectedEndpoint: string,
): Promise<{ endpoint: GatewayEndpoint; registry: GatewayRegistry } | null> => {
    if (
        !pendingCommit ||
        pendingCommit.endpoint_id !== binding.endpointId ||
        pendingCommit.session_ref !== binding.sessionRef ||
        !isRecoverableDeviceActivationEnvelope(pendingCommit, storedEnvelope, installationId)
    ) {
        return null;
    }
    if (storedEnvelope?.gateway_id !== binding.gatewayId) {
        throw new MobileDeviceActivationError('gateway_mismatch');
    }
    const committedEndpoint = pendingCommit.endpoint;
    if (
        canonicalEndpointKey(committedEndpoint.address) !== canonicalEndpointKey(protectedEndpoint)
    ) {
        throw new MobileDeviceActivationError('gateway_mismatch');
    }
    const recoveredEndpoint: GatewayEndpoint = {
        ...committedEndpoint,
        session_ref: pendingCommit.session_ref,
        server_gateway_id: pendingCommit.gateway_id,
    };
    const recoveredRegistry = upsertActivatedEndpoint(registry, recoveredEndpoint);
    try {
        saveGatewayRegistry(recoveredRegistry);
        clearPendingDeviceActivationCommit(binding.gatewayId);
    } catch (error) {
        throw new MobileDeviceActivationError('storage_failed', error);
    }
    await clearMobileGatewaySessionRuntime(recoveredEndpoint.id).catch(() => undefined);
    return { endpoint: recoveredEndpoint, registry: recoveredRegistry };
};

const canonicalEndpointKey = (address: string): string | null => {
    try {
        return new URL(address).toString();
    } catch {
        return null;
    }
};

const upsertActivatedEndpoint = (
    registry: GatewayRegistry,
    endpoint: GatewayEndpoint,
): GatewayRegistry => {
    const known = findGatewayEndpoint(registry, endpoint.id);
    const withEndpoint = known
        ? replaceGatewayEndpoint(registry, endpoint)
        : { ...registry, remotes: [...(registry.remotes ?? []), endpoint] };
    return {
        ...withEndpoint,
        version: 2,
        active_gateway_id: endpoint.id,
    };
};

const activationCommitStorageKey = (gatewayId: string): string =>
    `${DEVICE_ACTIVATION_COMMIT_STORAGE_PREFIX}${gatewayId}`;

const readPendingDeviceActivationCommit = (
    gatewayId: string,
): PendingDeviceActivationCommit | null => {
    const key = activationCommitStorageKey(gatewayId);
    const raw = storage.getString(key);
    if (!raw) {
        return null;
    }
    try {
        const value: unknown = JSON.parse(raw);
        const pending = decodePendingDeviceActivationCommit(value, gatewayId);
        if (!pending) {
            storage.remove(key);
            return null;
        }
        return pending;
    } catch {
        storage.remove(key);
        return null;
    }
};

const writePendingDeviceActivationCommit = (pending: PendingDeviceActivationCommit): void => {
    storage.set(activationCommitStorageKey(pending.gateway_id), JSON.stringify(pending));
};

const clearPendingDeviceActivationCommit = (gatewayId: string): void => {
    storage.remove(activationCommitStorageKey(gatewayId));
};

const clearPendingDeviceActivationCommitBestEffort = (gatewayId: string): void => {
    try {
        clearPendingDeviceActivationCommit(gatewayId);
    } catch {
        // This record contains no credential and is validated before recovery.
    }
};

const decodePendingDeviceActivationCommit = (
    value: unknown,
    expectedGatewayId: string,
): PendingDeviceActivationCommit | null => {
    if (!value || typeof value !== 'object') {
        return null;
    }
    const candidate = value as Record<string, unknown>;
    if (
        !Object.keys(candidate).every((key) => PENDING_DEVICE_ACTIVATION_COMMIT_KEYS.has(key)) ||
        candidate.schema_version !== 1 ||
        candidate.gateway_id !== expectedGatewayId ||
        typeof candidate.endpoint_id !== 'string' ||
        candidate.endpoint_id.length === 0 ||
        candidate.endpoint_id.length > 255 ||
        typeof candidate.session_ref !== 'string' ||
        candidate.session_ref.length === 0 ||
        candidate.session_ref.length > 255 ||
        !(
            candidate.previous_session_id === null ||
            (typeof candidate.previous_session_id === 'string' &&
                /^[A-Za-z0-9]{21}$/.test(candidate.previous_session_id))
        )
    ) {
        return null;
    }
    const endpoint = decodePendingDeviceActivationEndpoint(
        candidate.endpoint,
        candidate.endpoint_id,
        candidate.session_ref,
        expectedGatewayId,
    );
    if (!endpoint) {
        return null;
    }
    return {
        schema_version: 1,
        gateway_id: expectedGatewayId,
        endpoint_id: candidate.endpoint_id,
        session_ref: candidate.session_ref,
        endpoint,
        previous_session_id: candidate.previous_session_id,
    };
};

const decodePendingDeviceActivationEndpoint = (
    value: unknown,
    endpointId: string,
    sessionRef: string,
    gatewayId: string,
): GatewayEndpoint | null => {
    if (!value || typeof value !== 'object') {
        return null;
    }
    const candidate = value as Record<string, unknown>;
    if (
        !Object.keys(candidate).every((key) => PENDING_DEVICE_ACTIVATION_ENDPOINT_KEYS.has(key)) ||
        candidate.id !== endpointId ||
        typeof candidate.name !== 'string' ||
        candidate.name.length === 0 ||
        candidate.name.length > 255 ||
        typeof candidate.address !== 'string' ||
        !isProtectedDeviceActivationEndpoint(candidate.address) ||
        (candidate.kind !== 'local' && candidate.kind !== 'remote') ||
        candidate.session_ref !== sessionRef ||
        candidate.server_gateway_id !== gatewayId ||
        !(
            candidate.service_name === null ||
            (typeof candidate.service_name === 'string' &&
                candidate.service_name.length > 0 &&
                candidate.service_name.length <= 255)
        ) ||
        !(
            candidate.workspace_id === null ||
            (typeof candidate.workspace_id === 'string' &&
                candidate.workspace_id.length > 0 &&
                candidate.workspace_id.length <= 255)
        )
    ) {
        return null;
    }
    return {
        id: candidate.id,
        name: candidate.name,
        address: candidate.address,
        kind: candidate.kind,
        session_ref: candidate.session_ref,
        server_gateway_id: candidate.server_gateway_id,
        service_name: candidate.service_name,
        workspace_id: candidate.workspace_id,
    };
};

const isRecoverableDeviceActivationEnvelope = (
    pending: PendingDeviceActivationCommit,
    envelope: MobileGatewaySessionEnvelope | null,
    installationId: string,
): boolean =>
    Boolean(
        envelope &&
        envelope.gateway_id === pending.gateway_id &&
        envelope.installation_id === installationId &&
        envelope.session_id !== pending.previous_session_id,
    );

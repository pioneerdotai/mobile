import { nanoid } from 'nanoid';

import { PioneerClientNativeError, pioneerClient } from '@/client';
import { captureClientDiagnosticsOnError } from '@/services/client-diagnostics';
import { deleteMobileGatewaySession } from '@/services/gateway/session-storage';
import type {
    ActivateGatewayRegistryPlan,
    AddAndActivateRemoteGatewayRegistryPlan,
    DeleteRemoteGatewayRegistryPlan,
    GatewayEndpoint,
    GatewayRegistry,
    RemoteGatewayValidation,
    UpdateRemoteGatewayRegistryPlan,
} from '@/client';
import { storage } from '@/storage';

const REGISTRY_STORAGE_KEY = 'pioneer.gateway.registry.v2';
const REMOTE_GATEWAY_VALIDATION_TIMEOUT_MS = 2_500;
const REGISTRY_KEYS = new Set([
    'version',
    'installation_id',
    'active_gateway_id',
    'local',
    'remotes',
]);
const ENDPOINT_KEYS = new Set([
    'id',
    'name',
    'address',
    'kind',
    'session_ref',
    'server_gateway_id',
    'workspace_id',
    'service_name',
]);

export type AddRemoteGatewayInput = {
    name: string;
    address: string;
};

export type UpdateRemoteGatewayInput = {
    gatewayId: string;
    name: string;
    address: string;
};

export type GatewayOperationErrorCode =
    | 'invalidAddress'
    | 'invalidActivation'
    | 'notFound'
    | 'unreachable'
    | 'connectionFailed'
    | 'operationFailed';

export class GatewayOperationError extends Error {
    readonly code: GatewayOperationErrorCode;
    readonly source?: unknown;

    constructor(code: GatewayOperationErrorCode, source?: unknown) {
        super(code);
        this.name = 'GatewayOperationError';
        this.code = code;
        this.source = source;
    }
}

export class GatewayRegistryStorageError extends Error {
    readonly code = 'corrupted' as const;

    constructor(cause?: unknown) {
        super('Gateway registry is corrupted');
        this.name = 'GatewayRegistryStorageError';
        this.cause = cause;
    }
}

export const defaultGatewayRegistry = (): GatewayRegistry => ({
    version: 2,
    installation_id: nanoid(21),
    active_gateway_id: null,
    local: null,
    remotes: [],
});

export const normalizeStoredRegistry = (value: unknown): GatewayRegistry => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new GatewayRegistryStorageError();
    }

    const candidate = value as Partial<GatewayRegistry> & Record<string, unknown>;
    if (!hasOnlyKeys(candidate, REGISTRY_KEYS) || candidate.version !== 2) {
        throw new GatewayRegistryStorageError();
    }
    if (
        candidate.local !== null &&
        candidate.local !== undefined &&
        !isStoredGatewayEndpoint(candidate.local)
    ) {
        throw new GatewayRegistryStorageError();
    }
    if (!Array.isArray(candidate.remotes) || !candidate.remotes.every(isStoredGatewayEndpoint)) {
        throw new GatewayRegistryStorageError();
    }
    if (
        candidate.active_gateway_id !== null &&
        candidate.active_gateway_id !== undefined &&
        !isBoundedRegistryString(candidate.active_gateway_id)
    ) {
        throw new GatewayRegistryStorageError();
    }

    const local = candidate.local ?? null;
    const remotes = candidate.remotes;
    const endpoints = [local, ...remotes].filter(
        (endpoint): endpoint is GatewayEndpoint => endpoint !== null,
    );
    if (local?.kind !== undefined && local.kind !== 'local') {
        throw new GatewayRegistryStorageError();
    }
    if (remotes.some((endpoint) => endpoint.kind !== 'remote')) {
        throw new GatewayRegistryStorageError();
    }
    const endpointIds = new Set<string>();
    const sessionRefs = new Set<string>();
    let hasSessionBinding = false;
    for (const endpoint of endpoints) {
        if (endpointIds.has(endpoint.id)) {
            throw new GatewayRegistryStorageError();
        }
        endpointIds.add(endpoint.id);
        const sessionRef = endpoint.session_ref ?? null;
        const serverGatewayId = endpoint.server_gateway_id ?? null;
        if ((sessionRef === null) !== (serverGatewayId === null)) {
            throw new GatewayRegistryStorageError();
        }
        if (sessionRef !== null && serverGatewayId !== null) {
            if (
                !/^[A-Za-z0-9_-]{1,255}$/.test(sessionRef) ||
                !/^[A-Za-z0-9]{21}$/.test(serverGatewayId) ||
                sessionRefs.has(sessionRef)
            ) {
                throw new GatewayRegistryStorageError();
            }
            sessionRefs.add(sessionRef);
            hasSessionBinding = true;
        }
    }
    const storedInstallationId =
        typeof candidate.installation_id === 'string' ? candidate.installation_id.trim() : '';
    const installationIdIsValid =
        storedInstallationId.length > 0 &&
        storedInstallationId.length <= 255 &&
        !/[\u0000-\u001F\u007F]/.test(storedInstallationId);
    if (!installationIdIsValid && hasSessionBinding) {
        throw new GatewayRegistryStorageError();
    }
    return {
        version: 2,
        installation_id: installationIdIsValid ? storedInstallationId : nanoid(21),
        active_gateway_id:
            typeof candidate.active_gateway_id === 'string' ? candidate.active_gateway_id : null,
        local,
        remotes,
    };
};

const isStoredGatewayEndpoint = (value: unknown): value is GatewayEndpoint => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const endpoint = value as Partial<GatewayEndpoint> & Record<string, unknown>;
    return (
        hasOnlyKeys(endpoint, ENDPOINT_KEYS) &&
        isBoundedRegistryString(endpoint.id) &&
        isBoundedRegistryString(endpoint.name) &&
        isBoundedRegistryString(endpoint.address, 2_048) &&
        (endpoint.kind === 'local' || endpoint.kind === 'remote') &&
        isOptionalBoundedRegistryString(endpoint.session_ref) &&
        isOptionalBoundedRegistryString(endpoint.server_gateway_id) &&
        isOptionalBoundedRegistryString(endpoint.workspace_id) &&
        isOptionalBoundedRegistryString(endpoint.service_name)
    );
};

const isBoundedRegistryString = (value: unknown, maxLength = 255): value is string =>
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maxLength &&
    !/[\u0000-\u001F\u007F]/.test(value);

const isOptionalBoundedRegistryString = (value: unknown): value is string | null | undefined =>
    value === null || value === undefined || isBoundedRegistryString(value);

const hasOnlyKeys = (value: Record<string, unknown>, allowed: ReadonlySet<string>): boolean =>
    Object.keys(value).every((key) => allowed.has(key));

export const loadGatewayRegistry = (): GatewayRegistry => {
    const raw = storage.getString(REGISTRY_STORAGE_KEY);

    if (!raw) {
        const registry = defaultGatewayRegistry();
        saveGatewayRegistry(registry);
        return registry;
    }

    let decoded: unknown;
    try {
        decoded = JSON.parse(raw);
    } catch (error) {
        // Never overwrite an unreadable registry: it may be the only durable
        // pointer to a SecureStore session envelope.
        throw new GatewayRegistryStorageError(error);
    }
    const registry = normalizeStoredRegistry(decoded);
    saveGatewayRegistry(registry);
    return registry;
};

export const saveGatewayRegistry = (registry: GatewayRegistry): void => {
    const mobileRegistry: GatewayRegistry = {
        version: registry.version,
        installation_id: registry.installation_id ?? null,
        active_gateway_id: registry.active_gateway_id ?? null,
        local: registry.local ?? null,
        remotes: registry.remotes ?? [],
    };

    storage.set(REGISTRY_STORAGE_KEY, JSON.stringify(mobileRegistry));
};

export const findGatewayEndpoint = (
    registry: GatewayRegistry,
    gatewayId: string,
): GatewayEndpoint | null => {
    if (registry.local?.id === gatewayId) {
        return registry.local;
    }
    return (registry.remotes ?? []).find((endpoint) => endpoint.id === gatewayId) ?? null;
};

export const replaceGatewayEndpoint = (
    registry: GatewayRegistry,
    endpoint: GatewayEndpoint,
): GatewayRegistry => {
    if (registry.local?.id === endpoint.id) {
        return { ...registry, local: endpoint };
    }
    return {
        ...registry,
        remotes: (registry.remotes ?? []).map((candidate) =>
            candidate.id === endpoint.id ? endpoint : candidate,
        ),
    };
};

const remoteGatewayDefaultName = (index: number): string => {
    return `Remote Gateway ${index}`;
};

const remoteGatewayIndex = (registry: GatewayRegistry, gatewayId: string): number => {
    return (registry.remotes ?? []).findIndex((remote) => remote.id === gatewayId);
};

const requireRemoteGateway = (registry: GatewayRegistry, gatewayId: string): GatewayEndpoint => {
    const endpoint = (registry.remotes ?? []).find((remote) => remote.id === gatewayId);

    if (!endpoint) {
        throw new GatewayOperationError('notFound');
    }

    return endpoint;
};

export const validateRemoteGateway = async (address: string): Promise<RemoteGatewayValidation> => {
    try {
        const validation = await captureClientDiagnosticsOnError('gateway_validate_remote', () =>
            pioneerClient.gatewayValidateRemote({
                address,
                timeout_ms: REMOTE_GATEWAY_VALIDATION_TIMEOUT_MS,
            }),
        );

        if (validation.state !== 'reachable') {
            throw new GatewayOperationError('unreachable');
        }

        return validation;
    } catch (error) {
        throw normalizeGatewayOperationError(error, 'connectionFailed');
    }
};

export const addRemoteGateway = async (
    input: AddRemoteGatewayInput,
): Promise<AddAndActivateRemoteGatewayRegistryPlan> => {
    const registry = loadGatewayRegistry();
    const remoteCount = registry.remotes?.length ?? 0;
    const validation = await validateRemoteGateway(input.address);

    if (validation.state !== 'reachable') {
        throw new GatewayOperationError('unreachable');
    }

    try {
        const plan = await pioneerClient.gatewayPlanAddAndActivateRemoteRegistry({
            registry,
            name: input.name,
            address: validation.address,
            new_endpoint_id: null,
            default_remote_name: remoteGatewayDefaultName(remoteCount + 1),
        });

        saveGatewayRegistry(plan.registry);

        return plan;
    } catch (error) {
        throw normalizeGatewayOperationError(error, 'operationFailed');
    }
};

export const activateRemoteGateway = async (
    gatewayId: string,
): Promise<ActivateGatewayRegistryPlan> => {
    const registry = loadGatewayRegistry();
    requireRemoteGateway(registry, gatewayId);

    try {
        const plan = await pioneerClient.gatewayPlanActivateRegistry({
            registry,
            gateway_id: gatewayId,
        });

        saveGatewayRegistry(plan.registry);

        return plan;
    } catch (error) {
        throw normalizeGatewayOperationError(error, 'operationFailed');
    }
};

export const updateRemoteGateway = async (
    input: UpdateRemoteGatewayInput,
): Promise<UpdateRemoteGatewayRegistryPlan> => {
    const registry = loadGatewayRegistry();
    const endpoint = requireRemoteGateway(registry, input.gatewayId);
    const endpointIndex = remoteGatewayIndex(registry, input.gatewayId);
    const address = input.address.trim();
    const addressChanged = address !== endpoint.address;
    let plannedAddress = address;

    if (addressChanged) {
        const validation = await validateRemoteGateway(address);
        plannedAddress = validation.address;
    }

    try {
        const plan = await pioneerClient.gatewayPlanUpdateRemoteRegistry({
            registry,
            gateway_id: input.gatewayId,
            name: input.name,
            address: plannedAddress,
            default_remote_name: remoteGatewayDefaultName(
                endpointIndex >= 0 ? endpointIndex + 1 : (registry.remotes?.length ?? 0) + 1,
            ),
        });

        saveGatewayRegistry(plan.registry);
        return plan;
    } catch (error) {
        throw normalizeGatewayOperationError(error, 'operationFailed');
    }
};

export const deleteRemoteGateway = async (
    gatewayId: string,
): Promise<DeleteRemoteGatewayRegistryPlan> => {
    const registry = loadGatewayRegistry();
    requireRemoteGateway(registry, gatewayId);

    try {
        const plan = await pioneerClient.gatewayPlanDeleteRemoteRegistry({
            registry,
            gateway_id: gatewayId,
            local_gateway_id: null,
        });

        await commitRemoteGatewayDeletion(plan);

        return plan;
    } catch (error) {
        throw normalizeGatewayOperationError(error, 'operationFailed');
    }
};

type RemoteGatewayDeletionStorage = {
    deleteSession: (sessionRef: string) => Promise<void>;
    saveRegistry: (registry: GatewayRegistry) => void;
};

const defaultRemoteGatewayDeletionStorage: RemoteGatewayDeletionStorage = {
    deleteSession: deleteMobileGatewaySession,
    saveRegistry: saveGatewayRegistry,
};

export const commitRemoteGatewayDeletion = async (
    plan: DeleteRemoteGatewayRegistryPlan,
    persistence: RemoteGatewayDeletionStorage = defaultRemoteGatewayDeletionStorage,
): Promise<void> => {
    // Delete credentials while the old registry still points at them. Any
    // partial failure is therefore retryable; saving the registry first would
    // orphan a refresh credential with no durable reference for later cleanup.
    if (plan.endpoint.session_ref) {
        await persistence.deleteSession(plan.endpoint.session_ref);
    }
    persistence.saveRegistry(plan.registry);
};

const normalizeGatewayOperationError = (
    error: unknown,
    fallbackCode: GatewayOperationErrorCode,
): GatewayOperationError => {
    if (error instanceof GatewayOperationError) {
        return error;
    }

    if (error instanceof PioneerClientNativeError) {
        const message = error.message;
        if (/gateway not found|endpoint not found|not found/i.test(message)) {
            return new GatewayOperationError('notFound', error);
        }
        if (/invalid gateway address|gateway address must/i.test(message)) {
            return new GatewayOperationError('invalidAddress', error);
        }
        if (/\b401\b|unauthorized/i.test(message)) {
            return new GatewayOperationError('invalidActivation', error);
        }
        if (/failed to connect|websocket handshake failed|timeout/i.test(message)) {
            return new GatewayOperationError('connectionFailed', error);
        }
    }

    return new GatewayOperationError(fallbackCode, error);
};

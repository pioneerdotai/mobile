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

const REGISTRY_STORAGE_KEY = 'pioneer.gateway.registry.v3';
const LEGACY_REGISTRY_STORAGE_KEY = 'pioneer.gateway.registry.v2';
const REMOTE_GATEWAY_VALIDATION_TIMEOUT_MS = 2_500;

export type AddRemoteGatewayInput = {
    name: string;
    gateway_base_url: string;
};

export type UpdateRemoteGatewayInput = {
    gatewayId: string;
    name: string;
    gateway_base_url: string;
};

export type PreparedRemoteGatewayAddition = {
    plan: AddAndActivateRemoteGatewayRegistryPlan;
    validation: RemoteGatewayValidation;
};

export type PreparedRemoteGatewayUpdate = {
    plan: UpdateRemoteGatewayRegistryPlan;
    validation: RemoteGatewayValidation | null;
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

export class GatewayRegistryReconfigurationRequired extends Error {
    readonly code = 'reconfiguration_required' as const;
    readonly endpointIds: readonly string[];

    constructor(endpointIds: readonly string[]) {
        super('Gateway endpoint reconfiguration is required');
        this.name = 'GatewayRegistryReconfigurationRequired';
        this.endpointIds = [...endpointIds];
    }
}

export const defaultGatewayRegistry = (): GatewayRegistry => ({
    version: 3,
    installation_id: nanoid(21),
    active_gateway_id: null,
    local: null,
    remotes: [],
});

export const normalizeStoredRegistry = (value: unknown): GatewayRegistry => {
    try {
        return loadRegistryDocument(JSON.stringify(value));
    } catch (error) {
        if (error instanceof GatewayRegistryReconfigurationRequired) {
            throw error;
        }
        throw new GatewayRegistryStorageError(error);
    }
};

const loadRegistryDocument = (document: string): GatewayRegistry => {
    const result = pioneerClient.gatewayLoadRegistryV3({ document });
    if (result.state === 'reconfiguration_required') {
        throw new GatewayRegistryReconfigurationRequired(result.endpoint_ids);
    }
    return result.registry;
};

export const loadGatewayRegistry = (): GatewayRegistry => {
    const current = storage.getString(REGISTRY_STORAGE_KEY);
    const legacy = current ? undefined : storage.getString(LEGACY_REGISTRY_STORAGE_KEY);
    const raw = current ?? legacy;

    if (!raw) {
        const registry = defaultGatewayRegistry();
        saveGatewayRegistry(registry);
        return registry;
    }

    try {
        const registry = loadRegistryDocument(raw);
        saveGatewayRegistry(registry);
        if (legacy !== undefined) {
            storage.remove(LEGACY_REGISTRY_STORAGE_KEY);
        }
        return registry;
    } catch (error) {
        // Never overwrite an unreadable registry: it may be the only durable
        // pointer to a SecureStore session envelope.
        if (error instanceof GatewayRegistryReconfigurationRequired) {
            throw error;
        }
        throw new GatewayRegistryStorageError(error);
    }
};

export const saveGatewayRegistry = (registry: GatewayRegistry): void => {
    const mobileRegistry: GatewayRegistry = {
        version: 3,
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

export const validateRemoteGateway = async (
    gatewayBaseUrl: string,
): Promise<RemoteGatewayValidation> => {
    try {
        const validation = await captureClientDiagnosticsOnError('gateway_validate_remote', () =>
            pioneerClient.gatewayValidateRemote({
                gateway_base_url: gatewayBaseUrl,
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

export const prepareRemoteGatewayAddition = async (
    input: AddRemoteGatewayInput,
): Promise<PreparedRemoteGatewayAddition> => {
    const registry = loadGatewayRegistry();
    const remoteCount = registry.remotes?.length ?? 0;
    const validation = await validateRemoteGateway(input.gateway_base_url);

    if (validation.state !== 'reachable') {
        throw new GatewayOperationError('unreachable');
    }

    try {
        const plan = await pioneerClient.gatewayPlanAddAndActivateRemoteRegistry({
            registry,
            name: input.name,
            gateway_base_url: validation.gateway_base_url,
            new_endpoint_id: null,
            default_remote_name: remoteGatewayDefaultName(remoteCount + 1),
        });
        return { plan, validation };
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
): Promise<PreparedRemoteGatewayUpdate> => {
    const registry = loadGatewayRegistry();
    const endpoint = requireRemoteGateway(registry, input.gatewayId);
    const endpointIndex = remoteGatewayIndex(registry, input.gatewayId);
    const gatewayBaseUrl = input.gateway_base_url.trim();
    const baseUrlChanged = gatewayBaseUrl !== endpoint.gateway_base_url;
    let plannedGatewayBaseUrl = gatewayBaseUrl;
    let validation: RemoteGatewayValidation | null = null;

    if (baseUrlChanged) {
        validation = await validateRemoteGateway(gatewayBaseUrl);
        plannedGatewayBaseUrl = validation.gateway_base_url;
    }

    try {
        const plan = await pioneerClient.gatewayPlanUpdateRemoteRegistry({
            registry,
            gateway_id: input.gatewayId,
            name: input.name,
            gateway_base_url: plannedGatewayBaseUrl,
            default_remote_name: remoteGatewayDefaultName(
                endpointIndex >= 0 ? endpointIndex + 1 : (registry.remotes?.length ?? 0) + 1,
            ),
        });

        saveGatewayRegistry(plan.registry);
        return { plan, validation };
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
        if (/invalid gateway base url|gateway base url must/i.test(message)) {
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

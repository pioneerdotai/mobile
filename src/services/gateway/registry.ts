import { nanoid } from 'nanoid';
import { pioneerClient } from '@/client';
import type { GatewayRegistry } from '@/client';
import { storage } from '@/storage';

const REGISTRY_STORAGE_KEY = 'pioneer.gateway.registry.v3';
const LEGACY_REGISTRY_STORAGE_KEY = 'pioneer.gateway.registry.v2';

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

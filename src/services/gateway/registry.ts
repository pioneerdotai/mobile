import * as SecureStore from 'expo-secure-store';

import { PioneerClientNativeError, pioneerClient } from '@/client';
import type {
    ActivateGatewayRegistryPlan,
    AddAndActivateRemoteGatewayRegistryPlan,
    DeleteRemoteGatewayRegistryPlan,
    GatewayAuthTokenWrite,
    GatewayAuthTokenUpdate,
    GatewayEndpoint,
    GatewayRegistry,
    RemoteGatewayValidation,
    UpdateRemoteGatewayRegistryPlan,
} from '@/client';
import { storage } from '@/storage';

const REGISTRY_STORAGE_KEY = 'pioneer.gateway.registry.v1';
const TOKEN_STORAGE_KEY_PREFIX = 'pioneer.gateway.token';
const REMOTE_GATEWAY_VALIDATION_TIMEOUT_MS = 2_500;

export type AddRemoteGatewayInput = {
    name: string;
    address: string;
    token?: string | null;
};

export type UpdateRemoteGatewayInput = {
    gatewayId: string;
    name: string;
    address: string;
    token?: string | null;
    clearToken?: boolean;
};

export type GatewayOperationErrorCode =
    | 'invalidAddress'
    | 'invalidToken'
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

export const defaultGatewayRegistry = (): GatewayRegistry => ({
    version: 1,
    active_gateway_id: null,
    remotes: [],
});

const tokenStorageKey = (tokenRef: string): string => {
    return `${TOKEN_STORAGE_KEY_PREFIX}.${tokenRef}`;
};

const normalizeStoredRegistry = (value: unknown): GatewayRegistry => {
    if (!value || typeof value !== 'object') {
        return defaultGatewayRegistry();
    }

    const registry = value as GatewayRegistry;

    return {
        version: typeof registry.version === 'number' ? registry.version : 1,
        active_gateway_id:
            typeof registry.active_gateway_id === 'string' ? registry.active_gateway_id : null,
        remotes: Array.isArray(registry.remotes) ? registry.remotes : [],
    };
};

export const loadGatewayRegistry = (): GatewayRegistry => {
    const raw = storage.getString(REGISTRY_STORAGE_KEY);

    if (!raw) {
        const registry = defaultGatewayRegistry();
        saveGatewayRegistry(registry);
        return registry;
    }

    try {
        return normalizeStoredRegistry(JSON.parse(raw));
    } catch {
        const registry = defaultGatewayRegistry();
        saveGatewayRegistry(registry);
        return registry;
    }
};

export const saveGatewayRegistry = (registry: GatewayRegistry): void => {
    const mobileRegistry: GatewayRegistry = {
        version: registry.version,
        active_gateway_id: registry.active_gateway_id ?? null,
        remotes: registry.remotes ?? [],
    };

    storage.set(REGISTRY_STORAGE_KEY, JSON.stringify(mobileRegistry));
};

export const getGatewayAuthToken = async (tokenRef: string): Promise<string | null> => {
    return SecureStore.getItemAsync(tokenStorageKey(tokenRef));
};

export const deleteGatewayAuthToken = async (tokenRef: string): Promise<void> => {
    await SecureStore.deleteItemAsync(tokenStorageKey(tokenRef));
};

export const writeGatewayAuthToken = async (
    tokenWrite: GatewayAuthTokenWrite | null | undefined,
): Promise<void> => {
    if (!tokenWrite) {
        return;
    }

    const token = tokenWrite.token.trim();
    if (!token) {
        await deleteGatewayAuthToken(tokenWrite.token_ref);
        return;
    }

    await SecureStore.setItemAsync(tokenStorageKey(tokenWrite.token_ref), token);
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

const tokenUpdateFromInput = (input: UpdateRemoteGatewayInput): GatewayAuthTokenUpdate => {
    if (input.clearToken) {
        return { mode: 'clear' };
    }

    const token = input.token?.trim();
    if (token) {
        return { mode: 'replace', token };
    }

    return { mode: 'preserve' };
};

const tokenForValidation = async (
    endpoint: GatewayEndpoint,
    authTokenUpdate: GatewayAuthTokenUpdate,
): Promise<string | null> => {
    switch (authTokenUpdate.mode) {
        case 'replace':
            return authTokenUpdate.token;
        case 'clear':
            return null;
        case 'preserve':
            return endpoint.auth_token_ref
                ? getGatewayAuthToken(endpoint.auth_token_ref)
                : Promise.resolve(null);
    }
};

export const validateRemoteGateway = async (
    address: string,
    token?: string | null,
): Promise<RemoteGatewayValidation> => {
    try {
        const validation = await pioneerClient.gatewayValidateRemote({
            address,
            auth_token: token ?? null,
            timeout_ms: REMOTE_GATEWAY_VALIDATION_TIMEOUT_MS,
        });

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
    const validation = await validateRemoteGateway(input.address, input.token);

    if (validation.state !== 'reachable') {
        throw new GatewayOperationError('unreachable');
    }

    try {
        const plan = await pioneerClient.gatewayPlanAddAndActivateRemoteRegistry({
            registry,
            name: input.name,
            address: validation.address,
            auth_token: input.token ?? null,
            new_endpoint_id: null,
            default_remote_name: remoteGatewayDefaultName(remoteCount + 1),
        });

        await writeGatewayAuthToken(plan.token_write);
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
    const authTokenUpdate = tokenUpdateFromInput(input);
    const address = input.address.trim();
    const addressChanged = address !== endpoint.address;
    const tokenChanged = authTokenUpdate.mode !== 'preserve';
    let plannedAddress = address;

    if (addressChanged || tokenChanged) {
        const validationToken = await tokenForValidation(endpoint, authTokenUpdate);
        const validation = await validateRemoteGateway(address, validationToken);
        plannedAddress = validation.address;
    }

    try {
        const plan = await pioneerClient.gatewayPlanUpdateRemoteRegistry({
            registry,
            gateway_id: input.gatewayId,
            name: input.name,
            address: plannedAddress,
            auth_token_update: authTokenUpdate,
            default_remote_name: remoteGatewayDefaultName(
                endpointIndex >= 0 ? endpointIndex + 1 : (registry.remotes?.length ?? 0) + 1,
            ),
        });

        await writeGatewayAuthToken(plan.token_write);
        saveGatewayRegistry(plan.registry);
        if (plan.deleted_token_ref) {
            await deleteGatewayAuthToken(plan.deleted_token_ref);
        }

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
            local_gateway_has_auth_token: false,
        });

        saveGatewayRegistry(plan.registry);
        if (plan.deleted_token_ref) {
            await deleteGatewayAuthToken(plan.deleted_token_ref);
        }

        return plan;
    } catch (error) {
        throw normalizeGatewayOperationError(error, 'operationFailed');
    }
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
            return new GatewayOperationError('invalidToken', error);
        }
        if (/failed to connect|websocket handshake failed|timeout/i.test(message)) {
            return new GatewayOperationError('connectionFailed', error);
        }
    }

    return new GatewayOperationError(fallbackCode, error);
};

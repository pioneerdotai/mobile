import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { GatewayEndpoint, RemoteGatewayValidation } from '@/client';
import {
    GatewayOperationError,
    GatewayRegistryReconfigurationRequired,
    activateRemoteGateway,
    deleteRemoteGateway,
    prepareRemoteGatewayAddition,
    updateRemoteGateway,
    validateRemoteGateway,
} from '@/services/gateway/registry';
import type {
    AddRemoteGatewayInput,
    GatewayOperationErrorCode,
    UpdateRemoteGatewayInput,
} from '@/services/gateway/registry';
import { clearMobileGatewaySessionRuntime } from '@/services/gateway/session-coordinator';
import {
    MobileDeviceActivationError,
    acceptMobileDeviceActivation,
    recoverPendingMobileDeviceActivationCommits,
} from '@/services/gateway/device-activation';
import { useGatewayStore } from '@/stores/gateway';
import { useActiveThreadCleanup } from './use-active-thread-cleanup';

const normalizeErrorCode = (error: unknown): GatewayOperationErrorCode => {
    if (error instanceof GatewayOperationError) {
        return error.code;
    }
    if (error instanceof MobileDeviceActivationError) {
        switch (error.code) {
            case 'invalid_presentation':
                return 'invalidActivation';
            case 'activation_failed':
                return 'connectionFailed';
            case 'gateway_mismatch':
            case 'storage_failed':
                return 'operationFailed';
        }
    }

    return 'operationFailed';
};

const normalizeGatewayError = (error: unknown): GatewayOperationError => {
    if (error instanceof GatewayOperationError) {
        return error;
    }
    return new GatewayOperationError(normalizeErrorCode(error), error);
};

export const useGateway = () => {
    const clearActiveThreadSession = useActiveThreadCleanup();

    const {
        registry,
        bootstrapped,
        busy,
        error,
        gatewayTransportSecurity,
        registryReconfigurationEndpointIds,
        connectionId,
        connectionState,
        sessionRevision,
        setRegistry,
        setBootstrapped,
        setBusy,
        setError,
        setGatewayTransportSecurity,
        setRegistryReconfigurationEndpointIds,
        bumpSessionRevision,
        clearError,
    } = useGatewayStore(
        useShallow((state) => ({
            registry: state.registry,
            bootstrapped: state.bootstrapped,
            busy: state.busy,
            error: state.error,
            gatewayTransportSecurity: state.gatewayTransportSecurity,
            registryReconfigurationEndpointIds: state.registryReconfigurationEndpointIds,
            connectionId: state.connectionId,
            connectionState: state.connectionState,
            sessionRevision: state.sessionRevision,
            setRegistry: state.setRegistry,
            setBootstrapped: state.setBootstrapped,
            setBusy: state.setBusy,
            setError: state.setError,
            setGatewayTransportSecurity: state.setGatewayTransportSecurity,
            setRegistryReconfigurationEndpointIds: state.setRegistryReconfigurationEndpointIds,
            bumpSessionRevision: state.bumpSessionRevision,
            clearError: state.clearError,
        })),
    );

    const hydrate = useCallback(async (): Promise<void> => {
        try {
            const nextRegistry = await recoverPendingMobileDeviceActivationCommits();
            setRegistry(nextRegistry);
            setRegistryReconfigurationEndpointIds(null);
            setBootstrapped(true);
            setError(null);
        } catch (error) {
            if (!(error instanceof GatewayRegistryReconfigurationRequired)) {
                throw error;
            }
            setRegistryReconfigurationEndpointIds(error.endpointIds);
            setBootstrapped(true);
            setError('invalidAddress');
        }
    }, [setBootstrapped, setError, setRegistry, setRegistryReconfigurationEndpointIds]);

    const validateRemote = useCallback(
        async (gateway_base_url: string): Promise<RemoteGatewayValidation> => {
            setBusy(true);
            setError(null);
            try {
                const validation = await validateRemoteGateway(gateway_base_url);
                setGatewayTransportSecurity(validation.transport_security);
                setBusy(false);
                return validation;
            } catch (caught) {
                const error = normalizeGatewayError(caught);
                setBusy(false);
                setError(error.code);
                setGatewayTransportSecurity(null);
                throw error;
            }
        },
        [setBusy, setError, setGatewayTransportSecurity],
    );

    const addRemote = useCallback(
        async (
            input: AddRemoteGatewayInput & {
                activationCode: string;
                activationGatewayId?: string | null;
            },
        ): Promise<GatewayEndpoint> => {
            setBusy(true);
            setError(null);
            try {
                const prepared = await prepareRemoteGatewayAddition({
                    name: input.name,
                    gateway_base_url: input.gateway_base_url,
                });
                const { plan } = prepared;
                setGatewayTransportSecurity(prepared.validation.transport_security);
                const provisioned = await acceptMobileDeviceActivation(
                    {
                        gateway_base_url: plan.endpoint.gateway_base_url,
                        activation_code: input.activationCode,
                        gateway_id: input.activationGatewayId,
                    },
                    {
                        candidateRegistry: plan.registry,
                        pinnedGatewayId: plan.endpoint.server_gateway_id,
                    },
                );
                await clearMobileGatewaySessionRuntime(plan.endpoint.id).catch(() => undefined);
                await clearActiveThreadSession();
                setRegistry(provisioned.registry);
                bumpSessionRevision();
                setBusy(false);
                setError(null);
                return provisioned.endpoint;
            } catch (caught) {
                const error = normalizeGatewayError(caught);
                setBusy(false);
                setError(error.code);
                throw error;
            }
        },
        [
            bumpSessionRevision,
            clearActiveThreadSession,
            setBusy,
            setError,
            setGatewayTransportSecurity,
            setRegistry,
        ],
    );

    const activateRemote = useCallback(
        async (gatewayId: string): Promise<GatewayEndpoint> => {
            setBusy(true);
            setError(null);
            try {
                const previousActiveGatewayId =
                    useGatewayStore.getState().registry.active_gateway_id;
                const plan = await activateRemoteGateway(gatewayId);
                if (previousActiveGatewayId && previousActiveGatewayId !== plan.endpoint.id) {
                    await clearActiveThreadSession();
                }
                setRegistry(plan.registry);
                setBusy(false);
                setError(null);
                return plan.endpoint;
            } catch (caught) {
                const error = normalizeGatewayError(caught);
                setBusy(false);
                setError(error.code);
                throw error;
            }
        },
        [clearActiveThreadSession, setBusy, setError, setRegistry],
    );

    const authenticateRemote = useCallback(
        async (gatewayId: string, activationCode: string): Promise<GatewayEndpoint> => {
            setBusy(true);
            setError(null);
            try {
                const endpoint = (useGatewayStore.getState().registry.remotes ?? []).find(
                    (candidate) => candidate.id === gatewayId,
                );
                if (!endpoint) {
                    throw new GatewayOperationError('notFound');
                }
                const provisioned = await acceptMobileDeviceActivation(
                    {
                        gateway_base_url: endpoint.gateway_base_url,
                        activation_code: activationCode,
                    },
                    {
                        pinnedGatewayId: endpoint.server_gateway_id,
                    },
                );
                await clearMobileGatewaySessionRuntime(endpoint.id).catch(() => undefined);
                await clearActiveThreadSession();
                setRegistry(provisioned.registry);
                bumpSessionRevision();
                setBusy(false);
                return provisioned.endpoint;
            } catch (caught) {
                const error = normalizeGatewayError(caught);
                setBusy(false);
                setError(error.code);
                throw error;
            }
        },
        [bumpSessionRevision, clearActiveThreadSession, setBusy, setError, setRegistry],
    );

    const updateRemote = useCallback(
        async (input: UpdateRemoteGatewayInput): Promise<GatewayEndpoint> => {
            setBusy(true);
            setError(null);
            try {
                const activeGatewayWasEdited =
                    useGatewayStore.getState().registry.active_gateway_id === input.gatewayId;
                const prepared = await updateRemoteGateway(input);
                const { plan } = prepared;
                if (prepared.validation) {
                    setGatewayTransportSecurity(prepared.validation.transport_security);
                }
                const connectionFieldsChanged =
                    plan.endpoint.gateway_base_url !== plan.previous_endpoint.gateway_base_url;
                if (activeGatewayWasEdited && connectionFieldsChanged) {
                    await clearActiveThreadSession();
                }
                setRegistry(plan.registry);
                setBusy(false);
                setError(null);
                return plan.endpoint;
            } catch (caught) {
                const error = normalizeGatewayError(caught);
                setBusy(false);
                setError(error.code);
                throw error;
            }
        },
        [clearActiveThreadSession, setBusy, setError, setGatewayTransportSecurity, setRegistry],
    );

    const deleteRemote = useCallback(
        async (gatewayId: string): Promise<GatewayEndpoint> => {
            setBusy(true);
            setError(null);
            try {
                const plan = await deleteRemoteGateway(gatewayId);
                await clearMobileGatewaySessionRuntime(gatewayId).catch(() => undefined);
                if (plan.deleted_active) {
                    await clearActiveThreadSession();
                }
                setRegistry(plan.registry);
                setBusy(false);
                setError(null);
                return plan.endpoint;
            } catch (caught) {
                const error = normalizeGatewayError(caught);
                setBusy(false);
                setError(error.code);
                throw error;
            }
        },
        [clearActiveThreadSession, setBusy, setError, setRegistry],
    );

    return {
        registry,
        bootstrapped,
        busy,
        error,
        gatewayTransportSecurity,
        registryReconfigurationEndpointIds,
        connectionId,
        connectionState,
        sessionRevision,
        hydrate,
        validateRemote,
        addRemote,
        activateRemote,
        authenticateRemote,
        updateRemote,
        deleteRemote,
        clearError,
    };
};

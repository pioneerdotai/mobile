import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { GatewayEndpoint, RemoteGatewayValidation } from '@/client';
import {
    GatewayOperationError,
    activateRemoteGateway,
    addRemoteGateway,
    deleteRemoteGateway,
    loadGatewayRegistry,
    updateRemoteGateway,
    validateRemoteGateway,
} from '@/services/gateway/registry';
import type {
    AddRemoteGatewayInput,
    GatewayOperationErrorCode,
    UpdateRemoteGatewayInput,
} from '@/services/gateway/registry';
import { useGatewayStore } from '@/stores/gateway';
import { useActiveThreadCleanup } from './use-active-thread-cleanup';

const normalizeErrorCode = (error: unknown): GatewayOperationErrorCode => {
    if (error instanceof GatewayOperationError) {
        return error.code;
    }

    return 'operationFailed';
};

export const useGateway = () => {
    const clearActiveThreadSession = useActiveThreadCleanup();

    const {
        registry,
        bootstrapped,
        busy,
        error,
        connectionId,
        connectionState,
        sessionRevision,
        setRegistry,
        setBootstrapped,
        setBusy,
        setError,
        bumpSessionRevision,
        clearError,
    } = useGatewayStore(
        useShallow((state) => ({
            registry: state.registry,
            bootstrapped: state.bootstrapped,
            busy: state.busy,
            error: state.error,
            connectionId: state.connectionId,
            connectionState: state.connectionState,
            sessionRevision: state.sessionRevision,
            setRegistry: state.setRegistry,
            setBootstrapped: state.setBootstrapped,
            setBusy: state.setBusy,
            setError: state.setError,
            bumpSessionRevision: state.bumpSessionRevision,
            clearError: state.clearError,
        })),
    );

    const hydrate = useCallback(async (): Promise<void> => {
        const nextRegistry = loadGatewayRegistry();
        setRegistry(nextRegistry);
        setBootstrapped(true);
        setError(null);
    }, [setBootstrapped, setError, setRegistry]);

    const validateRemote = useCallback(
        async (address: string, token?: string | null): Promise<RemoteGatewayValidation> => {
            setBusy(true);
            setError(null);
            try {
                const validation = await validateRemoteGateway(address, token);
                setBusy(false);
                return validation;
            } catch (caught) {
                setBusy(false);
                setError(normalizeErrorCode(caught));
                throw caught;
            }
        },
        [setBusy, setError],
    );

    const addRemote = useCallback(
        async (input: AddRemoteGatewayInput): Promise<GatewayEndpoint> => {
            setBusy(true);
            setError(null);
            try {
                const plan = await addRemoteGateway(input);
                await clearActiveThreadSession();
                setRegistry(plan.registry);
                setBusy(false);
                setError(null);
                return plan.endpoint;
            } catch (caught) {
                setBusy(false);
                setError(normalizeErrorCode(caught));
                throw caught;
            }
        },
        [clearActiveThreadSession, setBusy, setError, setRegistry],
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
                setBusy(false);
                setError(normalizeErrorCode(caught));
                throw caught;
            }
        },
        [clearActiveThreadSession, setBusy, setError, setRegistry],
    );

    const updateRemote = useCallback(
        async (input: UpdateRemoteGatewayInput): Promise<GatewayEndpoint> => {
            setBusy(true);
            setError(null);
            try {
                const activeGatewayWasEdited =
                    useGatewayStore.getState().registry.active_gateway_id === input.gatewayId;
                const plan = await updateRemoteGateway(input);
                const connectionFieldsChanged =
                    plan.endpoint.address !== plan.previous_endpoint.address ||
                    plan.endpoint.auth_token_ref !== plan.previous_endpoint.auth_token_ref;
                const connectionTokenChanged = !!plan.token_write;
                if (activeGatewayWasEdited && (connectionFieldsChanged || connectionTokenChanged)) {
                    await clearActiveThreadSession();
                }
                setRegistry(plan.registry);
                if (activeGatewayWasEdited && !connectionFieldsChanged && connectionTokenChanged) {
                    bumpSessionRevision();
                }
                setBusy(false);
                setError(null);
                return plan.endpoint;
            } catch (caught) {
                setBusy(false);
                setError(normalizeErrorCode(caught));
                throw caught;
            }
        },
        [bumpSessionRevision, clearActiveThreadSession, setBusy, setError, setRegistry],
    );

    const deleteRemote = useCallback(
        async (gatewayId: string): Promise<GatewayEndpoint> => {
            setBusy(true);
            setError(null);
            try {
                const plan = await deleteRemoteGateway(gatewayId);
                if (plan.deleted_active) {
                    await clearActiveThreadSession();
                }
                setRegistry(plan.registry);
                setBusy(false);
                setError(null);
                return plan.endpoint;
            } catch (caught) {
                setBusy(false);
                setError(normalizeErrorCode(caught));
                throw caught;
            }
        },
        [clearActiveThreadSession, setBusy, setError, setRegistry],
    );

    return {
        registry,
        bootstrapped,
        busy,
        error,
        connectionId,
        connectionState,
        sessionRevision,
        hydrate,
        validateRemote,
        addRemote,
        activateRemote,
        updateRemote,
        deleteRemote,
        clearError,
    };
};

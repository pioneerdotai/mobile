import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { GatewayEndpoint } from '@/client';
import { bootstrapActiveGatewayWorkspace } from '@/services/workspace/bootstrap';
import {
    WorkspaceOperationError,
    createWorkspace,
    renameWorkspace,
    switchActiveGatewayWorkspace,
} from '@/services/workspace/management';
import type {
    SwitchWorkspaceResult,
    WorkspaceOperationErrorCode,
} from '@/services/workspace/management';
import { useGatewayStore } from '@/stores/gateway';
import { useWorkspaceStore } from '@/stores/workspace';

import { useActiveThreadCleanup } from './use-active-thread-cleanup';

type WorkspaceConnectionContext = {
    gateway: GatewayEndpoint;
    connectionId: number;
};

const activeGatewayFromStore = (): GatewayEndpoint | null => {
    const registry = useGatewayStore.getState().registry;

    return (
        (registry.remotes ?? []).find((remote) => remote.id === registry.active_gateway_id) ?? null
    );
};

const normalizeErrorCode = (
    error: unknown,
    fallbackCode: WorkspaceOperationErrorCode,
): WorkspaceOperationErrorCode => {
    if (error instanceof WorkspaceOperationError) {
        return error.code;
    }

    return fallbackCode;
};

export const useWorkspace = () => {
    const clearActiveThreadSession = useActiveThreadCleanup();
    const setGatewayRegistry = useGatewayStore((state) => state.setRegistry);

    const {
        workspaces,
        activeWorkspaceId,
        preferredWorkspaceId,
        loading,
        error,
        bootstrappedConnectionId,
        setWorkspaces,
        setActiveWorkspaceId,
        setPreferredWorkspaceId,
        setLoading,
        setError,
        setBootstrappedConnectionId,
        resetConnectionBootstrap,
    } = useWorkspaceStore(
        useShallow((state) => ({
            workspaces: state.workspaces,
            activeWorkspaceId: state.activeWorkspaceId,
            preferredWorkspaceId: state.preferredWorkspaceId,
            loading: state.loading,
            error: state.error,
            bootstrappedConnectionId: state.bootstrappedConnectionId,
            setWorkspaces: state.setWorkspaces,
            setActiveWorkspaceId: state.setActiveWorkspaceId,
            setPreferredWorkspaceId: state.setPreferredWorkspaceId,
            setLoading: state.setLoading,
            setError: state.setError,
            setBootstrappedConnectionId: state.setBootstrappedConnectionId,
            resetConnectionBootstrap: state.resetConnectionBootstrap,
        })),
    );

    const ensureWorkspaceIdle = useCallback((): void => {
        if (!useWorkspaceStore.getState().loading) {
            return;
        }

        const error = new WorkspaceOperationError('busy');
        setError(error.code);
        throw error;
    }, [setError]);

    const requireWorkspaceConnection = useCallback((): WorkspaceConnectionContext => {
        const gatewayState = useGatewayStore.getState();
        const gateway = activeGatewayFromStore();
        if (!gateway) {
            const error = new WorkspaceOperationError('gatewayNotFound');
            setError(error.code);
            throw error;
        }

        if (gatewayState.connectionState !== 'Connected' || gatewayState.connectionId === null) {
            const error = new WorkspaceOperationError('gatewayNotConnected');
            setError(error.code);
            throw error;
        }

        return {
            gateway,
            connectionId: gatewayState.connectionId,
        };
    }, [setError]);

    const bootstrapResultIsCurrent = useCallback(
        (gatewayId: string, connectionId: number): boolean => {
            const gatewayState = useGatewayStore.getState();

            return (
                gatewayState.connectionState === 'Connected' &&
                gatewayState.connectionId === connectionId &&
                gatewayState.registry.active_gateway_id === gatewayId
            );
        },
        [],
    );

    const workspaceResultIsCurrent = useCallback(
        (context: WorkspaceConnectionContext): boolean => {
            return bootstrapResultIsCurrent(context.gateway.id, context.connectionId);
        },
        [bootstrapResultIsCurrent],
    );

    const bootstrapGatewayWorkspace = useCallback(
        async (activeGateway: GatewayEndpoint, connectionId: number): Promise<void> => {
            setLoading(true);
            setError(null);

            try {
                const result = await bootstrapActiveGatewayWorkspace(activeGateway);
                if (!bootstrapResultIsCurrent(activeGateway.id, connectionId)) {
                    return;
                }

                const selected = result.reduction.selected;

                setBootstrappedConnectionId(connectionId);
                setGatewayRegistry(result.registry);
                setWorkspaces(result.reduction.workspaces);
                setActiveWorkspaceId(selected.workspace_id);
                setPreferredWorkspaceId(selected.set_preferred_workspace_id);
                setError(null);
            } catch (caught) {
                if (!bootstrapResultIsCurrent(activeGateway.id, connectionId)) {
                    return;
                }

                setError(normalizeErrorCode(caught, 'bootstrapFailed'));
                throw caught;
            } finally {
                if (bootstrapResultIsCurrent(activeGateway.id, connectionId)) {
                    setLoading(false);
                }
            }
        },
        [
            bootstrapResultIsCurrent,
            setActiveWorkspaceId,
            setBootstrappedConnectionId,
            setError,
            setGatewayRegistry,
            setLoading,
            setPreferredWorkspaceId,
            setWorkspaces,
        ],
    );

    const applyWorkspaceSwitchResult = useCallback(
        (switchResult: SwitchWorkspaceResult): void => {
            const { registry, result } = switchResult;

            switch (result.status) {
                case 'switched': {
                    const selected = result.reduction.selected;
                    setGatewayRegistry(registry);
                    setWorkspaces(result.reduction.workspaces);
                    setActiveWorkspaceId(selected.workspace_id);
                    setPreferredWorkspaceId(selected.set_preferred_workspace_id);
                    setError(null);
                    return;
                }
                case 'noop':
                    setError(null);
                    return;
                case 'busy':
                    throw new WorkspaceOperationError('busy');
                case 'missing_workspace_id':
                    throw new WorkspaceOperationError('selectFailed');
                case 'unknown_target':
                    throw new WorkspaceOperationError('unknownTarget');
            }
        },
        [
            setActiveWorkspaceId,
            setError,
            setGatewayRegistry,
            setPreferredWorkspaceId,
            setWorkspaces,
        ],
    );

    const switchWorkspace = useCallback(
        async (workspaceId: string): Promise<void> => {
            ensureWorkspaceIdle();
            const connectionContext = requireWorkspaceConnection();
            const workspaceState = useWorkspaceStore.getState();

            setLoading(true);
            setError(null);

            try {
                const result = await switchActiveGatewayWorkspace({
                    activeGateway: connectionContext.gateway,
                    workspaceId,
                    currentWorkspaceId: workspaceState.activeWorkspaceId,
                    workspaces: workspaceState.workspaces,
                });

                if (!workspaceResultIsCurrent(connectionContext)) {
                    return;
                }

                if (result.result.status === 'switched') {
                    await clearActiveThreadSession();
                }
                applyWorkspaceSwitchResult(result);
            } catch (caught) {
                if (!workspaceResultIsCurrent(connectionContext)) {
                    return;
                }

                setError(normalizeErrorCode(caught, 'selectFailed'));
                throw caught;
            } finally {
                if (workspaceResultIsCurrent(connectionContext)) {
                    setLoading(false);
                }
            }
        },
        [
            ensureWorkspaceIdle,
            applyWorkspaceSwitchResult,
            clearActiveThreadSession,
            requireWorkspaceConnection,
            setError,
            setLoading,
            workspaceResultIsCurrent,
        ],
    );

    const createAndSwitchWorkspace = useCallback(
        async (name: string): Promise<void> => {
            ensureWorkspaceIdle();
            const connectionContext = requireWorkspaceConnection();
            const workspaceState = useWorkspaceStore.getState();

            setLoading(true);
            setError(null);

            try {
                const result = await createWorkspace({
                    name,
                    workspaces: workspaceState.workspaces,
                });

                switch (result.status) {
                    case 'created':
                        if (!workspaceResultIsCurrent(connectionContext)) {
                            return;
                        }

                        setWorkspaces(result.reduction.workspaces);
                        setError(null);
                        const switchResult = await switchActiveGatewayWorkspace({
                            activeGateway: connectionContext.gateway,
                            workspaceId: result.reduction.switch_workspace_id,
                            currentWorkspaceId: workspaceState.activeWorkspaceId,
                            workspaces: result.reduction.workspaces,
                        });
                        if (!workspaceResultIsCurrent(connectionContext)) {
                            return;
                        }

                        if (switchResult.result.status === 'switched') {
                            await clearActiveThreadSession();
                        }
                        applyWorkspaceSwitchResult(switchResult);
                        return;
                    case 'empty_name':
                        throw new WorkspaceOperationError('emptyName');
                    case 'busy':
                        throw new WorkspaceOperationError('busy');
                }
            } catch (caught) {
                if (!workspaceResultIsCurrent(connectionContext)) {
                    return;
                }

                setError(normalizeErrorCode(caught, 'createFailed'));
                throw caught;
            } finally {
                if (workspaceResultIsCurrent(connectionContext)) {
                    setLoading(false);
                }
            }
        },
        [
            ensureWorkspaceIdle,
            applyWorkspaceSwitchResult,
            clearActiveThreadSession,
            requireWorkspaceConnection,
            setError,
            setLoading,
            setWorkspaces,
            workspaceResultIsCurrent,
        ],
    );

    const renameExistingWorkspace = useCallback(
        async (workspaceId: string, name: string): Promise<void> => {
            ensureWorkspaceIdle();
            const connectionContext = requireWorkspaceConnection();
            const workspaceState = useWorkspaceStore.getState();

            setLoading(true);
            setError(null);

            try {
                const result = await renameWorkspace({
                    workspaceId,
                    name,
                    workspaces: workspaceState.workspaces,
                });

                if (!workspaceResultIsCurrent(connectionContext)) {
                    return;
                }

                switch (result.status) {
                    case 'renamed':
                        setWorkspaces(result.reduction.workspaces);
                        setError(null);
                        return;
                    case 'unchanged':
                        setError(null);
                        return;
                    case 'empty_name':
                        throw new WorkspaceOperationError('emptyName');
                    case 'busy':
                        throw new WorkspaceOperationError('busy');
                }
            } catch (caught) {
                if (!workspaceResultIsCurrent(connectionContext)) {
                    return;
                }

                setError(normalizeErrorCode(caught, 'renameFailed'));
                throw caught;
            } finally {
                if (workspaceResultIsCurrent(connectionContext)) {
                    setLoading(false);
                }
            }
        },
        [
            ensureWorkspaceIdle,
            requireWorkspaceConnection,
            setError,
            setLoading,
            setWorkspaces,
            workspaceResultIsCurrent,
        ],
    );

    return {
        workspaces,
        activeWorkspaceId,
        preferredWorkspaceId,
        loading,
        error,
        bootstrappedConnectionId,
        bootstrapGatewayWorkspace,
        switchWorkspace,
        createWorkspace: createAndSwitchWorkspace,
        renameWorkspace: renameExistingWorkspace,
        resetConnectionBootstrap,
    };
};

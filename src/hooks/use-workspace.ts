import { useCallback, useState } from 'react';
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
import { mobileStartup } from '@/services/telemetry/mobile-startup';
import { loadCliRuntimeSummariesInBackground } from '@/services/providers/cli-runtime-snapshot';

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

// Form/connection validation stays local; request failures are Client catalog output.
const localWorkspaceError = (
    error: unknown,
    fallback: WorkspaceOperationErrorCode,
): WorkspaceOperationErrorCode | null => {
    const code = normalizeErrorCode(error, fallback);
    return [
        'busy',
        'emptyName',
        'unknownTarget',
        'gatewayNotFound',
        'gatewayNotConnected',
    ].includes(code)
        ? code
        : null;
};

export const useWorkspace = () => {
    const {
        workspaces,
        activeWorkspaceId,
        preferredWorkspaceId,
        loading,
        error: catalogError,
        bootstrappedConnectionId,
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
            setBootstrappedConnectionId: state.setBootstrappedConnectionId,
            resetConnectionBootstrap: state.resetConnectionBootstrap,
        })),
    );

    const [localError, setError] = useState<WorkspaceOperationErrorCode | null>(null);
    const error = localError ?? catalogError;
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
            mobileStartup.begin('workspace.load');
            setError(null);

            try {
                const result = await bootstrapActiveGatewayWorkspace(activeGateway);
                if (!bootstrapResultIsCurrent(activeGateway.id, connectionId)) {
                    return;
                }

                const selected = result.reduction.selected;

                setBootstrappedConnectionId(connectionId);
                setError(null);
                mobileStartup.succeed('workspace.load');
                loadCliRuntimeSummariesInBackground(selected.workspace_id);
            } catch (caught) {
                if (!bootstrapResultIsCurrent(activeGateway.id, connectionId)) {
                    return;
                }

                setError(localWorkspaceError(caught, 'bootstrapFailed'));
                mobileStartup.fail('workspace.load');
                throw caught;
            }
        },
        [bootstrapResultIsCurrent, setBootstrappedConnectionId, setError],
    );

    const applyWorkspaceSwitchResult = useCallback(
        (switchResult: SwitchWorkspaceResult): void => {
            const { result } = switchResult;

            switch (result.status) {
                case 'switched': {
                    const selected = result.reduction.selected;
                    setError(null);
                    loadCliRuntimeSummariesInBackground(selected.workspace_id);
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
        [setError],
    );

    const switchWorkspace = useCallback(
        async (workspaceId: string): Promise<void> => {
            ensureWorkspaceIdle();
            const connectionContext = requireWorkspaceConnection();
            const workspaceState = useWorkspaceStore.getState();
            const targetWorkspace = workspaceState.workspaces.find(
                (workspace) => workspace.id === workspaceId && workspace.is_active,
            );
            if (!targetWorkspace) {
                const error = new WorkspaceOperationError('unknownTarget');
                setError(error.code);
                throw error;
            }

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

                applyWorkspaceSwitchResult(result);
            } catch (caught) {
                if (!workspaceResultIsCurrent(connectionContext)) {
                    return;
                }

                setError(localWorkspaceError(caught, 'selectFailed'));
                throw caught;
            }
        },
        [
            ensureWorkspaceIdle,
            applyWorkspaceSwitchResult,
            requireWorkspaceConnection,
            setError,
            workspaceResultIsCurrent,
        ],
    );

    const createAndSwitchWorkspace = useCallback(
        async (name: string): Promise<void> => {
            ensureWorkspaceIdle();
            const connectionContext = requireWorkspaceConnection();
            const workspaceState = useWorkspaceStore.getState();

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

                setError(localWorkspaceError(caught, 'createFailed'));
                throw caught;
            }
        },
        [
            ensureWorkspaceIdle,
            applyWorkspaceSwitchResult,
            requireWorkspaceConnection,
            setError,
            workspaceResultIsCurrent,
        ],
    );

    const renameExistingWorkspace = useCallback(
        async (workspaceId: string, name: string): Promise<void> => {
            ensureWorkspaceIdle();
            const connectionContext = requireWorkspaceConnection();
            const workspaceState = useWorkspaceStore.getState();

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

                setError(localWorkspaceError(caught, 'renameFailed'));
                throw caught;
            }
        },
        [ensureWorkspaceIdle, requireWorkspaceConnection, setError, workspaceResultIsCurrent],
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

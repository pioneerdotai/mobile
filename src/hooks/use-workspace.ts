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
        resetConnectionBootstrap,
    } = useWorkspaceStore(
        useShallow((state) => ({
            workspaces: state.workspaces,
            activeWorkspaceId: state.activeWorkspaceId,
            preferredWorkspaceId: state.preferredWorkspaceId,
            loading: state.loading,
            error: state.error,
            bootstrappedConnectionId: state.bootstrappedConnectionId,
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

    const bootstrapGatewayWorkspace = useCallback(
        async (activeGateway: GatewayEndpoint, _connectionId: number): Promise<void> => {
            mobileStartup.begin('workspace.load');
            setError(null);

            try {
                const result = await bootstrapActiveGatewayWorkspace(activeGateway);

                const selected = result.reduction.selected;

                setError(null);
                mobileStartup.succeed('workspace.load');
                loadCliRuntimeSummariesInBackground(selected.workspace_id);
            } catch (caught) {
                setError(localWorkspaceError(caught, 'bootstrapFailed'));
                mobileStartup.fail('workspace.load');
                throw caught;
            }
        },
        [setError],
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
            setError(null);

            try {
                const result = await switchActiveGatewayWorkspace({
                    activeGateway: connectionContext.gateway,
                    workspaceId,
                });

                applyWorkspaceSwitchResult(result);
            } catch (caught) {
                setError(localWorkspaceError(caught, 'selectFailed'));
                throw caught;
            }
        },
        [ensureWorkspaceIdle, applyWorkspaceSwitchResult, requireWorkspaceConnection, setError],
    );

    const createAndSwitchWorkspace = useCallback(
        async (name: string): Promise<void> => {
            ensureWorkspaceIdle();
            const connectionContext = requireWorkspaceConnection();

            setError(null);

            try {
                const result = await createWorkspace({
                    name,
                    activeGateway: connectionContext.gateway,
                });

                switch (result.status) {
                    case 'created':
                        setError(null);
                        loadCliRuntimeSummariesInBackground(result.reduction.switch_workspace_id);
                        return;
                    case 'empty_name':
                        throw new WorkspaceOperationError('emptyName');
                    case 'busy':
                        throw new WorkspaceOperationError('busy');
                }
            } catch (caught) {
                setError(localWorkspaceError(caught, 'createFailed'));
                throw caught;
            }
        },
        [ensureWorkspaceIdle, requireWorkspaceConnection, setError],
    );

    const renameExistingWorkspace = useCallback(
        async (workspaceId: string, name: string): Promise<void> => {
            ensureWorkspaceIdle();
            requireWorkspaceConnection();

            setError(null);

            try {
                const result = await renameWorkspace({
                    workspaceId,
                    name,
                });

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
                setError(localWorkspaceError(caught, 'renameFailed'));
                throw caught;
            }
        },
        [ensureWorkspaceIdle, requireWorkspaceConnection, setError],
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

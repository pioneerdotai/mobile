import { PioneerClientNativeError, pioneerClient } from '@/client';
import type {
    GatewayEndpoint,
    GatewayRegistry,
    Workspace,
    WorkspaceCreateResult,
    WorkspaceRenameResult,
    WorkspaceSwitchResult,
} from '@/client';
import { loadGatewayRegistry, saveGatewayRegistry } from '@/services/gateway/registry';
import { runGatewayTransportTransition } from '@/services/gateway/transport-coordinator';

export type WorkspaceOperationErrorCode =
    | 'gatewayNotFound'
    | 'gatewayNotConnected'
    | 'bootstrapFailed'
    | 'selectFailed'
    | 'createFailed'
    | 'renameFailed'
    | 'emptyName'
    | 'busy'
    | 'unknownTarget';

export class WorkspaceOperationError extends Error {
    readonly code: WorkspaceOperationErrorCode;
    readonly source?: unknown;

    constructor(code: WorkspaceOperationErrorCode, source?: unknown) {
        super(code);
        this.name = 'WorkspaceOperationError';
        this.code = code;
        this.source = source;
    }
}

export type SwitchWorkspaceInput = {
    activeGateway: GatewayEndpoint;
    workspaceId: string;
    currentWorkspaceId: string | null;
    workspaces: Workspace[];
};

export type SwitchWorkspaceResult = {
    registry: GatewayRegistry;
    result: WorkspaceSwitchResult;
};

export type CreateWorkspaceInput = {
    name: string;
    workspaces: Workspace[];
};

export type RenameWorkspaceInput = {
    workspaceId: string;
    name: string;
    workspaces: Workspace[];
};

export const switchActiveGatewayWorkspace = async (
    input: SwitchWorkspaceInput,
): Promise<SwitchWorkspaceResult> => {
    try {
        return await runGatewayTransportTransition(async () => {
            const result = await pioneerClient.workspaceSwitch({
                workspace_id: input.workspaceId,
                current_workspace_id: input.currentWorkspaceId,
                workspaces: input.workspaces,
                action_in_progress: false,
            });

            if (result.status !== 'switched') {
                return {
                    registry: loadGatewayRegistry(),
                    result,
                };
            }

            const plan = await pioneerClient.gatewayPlanSetWorkspaceRegistry({
                registry: loadGatewayRegistry(),
                gateway_id: input.activeGateway.id,
                workspace_id: result.reduction.selected.persist_active_gateway_workspace_id,
            });

            saveGatewayRegistry(plan.registry);

            return {
                registry: plan.registry,
                result,
            };
        });
    } catch (error) {
        throw normalizeWorkspaceOperationError(error, 'selectFailed');
    }
};

export const createWorkspace = async (
    input: CreateWorkspaceInput,
): Promise<WorkspaceCreateResult> => {
    try {
        return await pioneerClient.workspaceCreate({
            name: input.name,
            workspaces: input.workspaces,
            action_in_progress: false,
        });
    } catch (error) {
        throw normalizeWorkspaceOperationError(error, 'createFailed');
    }
};

export const renameWorkspace = async (
    input: RenameWorkspaceInput,
): Promise<WorkspaceRenameResult> => {
    try {
        return await pioneerClient.workspaceRename({
            workspace_id: input.workspaceId,
            name: input.name,
            workspaces: input.workspaces,
            action_in_progress: false,
        });
    } catch (error) {
        throw normalizeWorkspaceOperationError(error, 'renameFailed');
    }
};

export const normalizeWorkspaceOperationError = (
    error: unknown,
    fallbackCode: WorkspaceOperationErrorCode,
): WorkspaceOperationError => {
    if (error instanceof WorkspaceOperationError) {
        return error;
    }

    if (error instanceof PioneerClientNativeError) {
        if (/gateway not found|endpoint not found|not found/i.test(error.message)) {
            return new WorkspaceOperationError('gatewayNotFound', error);
        }
    }

    return new WorkspaceOperationError(fallbackCode, error);
};

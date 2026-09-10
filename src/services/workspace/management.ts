import { drainWorkspacePublications } from '@/client/workspaces';
import { PioneerClientNativeError, pioneerClient } from '@/client';
import type {
    GatewayEndpoint,
    WorkspaceCreateResult,
    WorkspaceRenameResult,
    WorkspaceSwitchResult,
} from '@/client';
import { persistGatewayWorkspace } from '@/client/onboarding';
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
};

export type SwitchWorkspaceResult = {
    result: WorkspaceSwitchResult;
};

export type CreateWorkspaceInput = {
    name: string;
    activeGateway: GatewayEndpoint;
};

export type RenameWorkspaceInput = {
    workspaceId: string;
    name: string;
};

export const switchActiveGatewayWorkspace = async (
    input: SwitchWorkspaceInput,
): Promise<SwitchWorkspaceResult> => {
    try {
        return await runGatewayTransportTransition(async () => {
            const result = await pioneerClient.workspaceSwitch({
                workspace_id: input.workspaceId,
            });

            if (result.status !== 'switched') {
                return {
                    result,
                };
            }

            await persistGatewayWorkspace(
                input.activeGateway.id,
                result.reduction.selected.persist_active_gateway_workspace_id ?? null,
            );

            return {
                result,
            };
        });
    } catch (error) {
        throw normalizeWorkspaceOperationError(error, 'selectFailed');
    } finally {
        drainWorkspacePublications(null);
    }
};

export const createWorkspace = async (
    input: CreateWorkspaceInput,
): Promise<WorkspaceCreateResult> => {
    try {
        return await runGatewayTransportTransition(async () => {
            const result = await pioneerClient.workspaceCreate({ name: input.name });
            if (result.status === 'created') {
                await persistGatewayWorkspace(
                    input.activeGateway.id,
                    result.reduction.switch_workspace_id,
                );
            }
            return result;
        });
    } catch (error) {
        throw normalizeWorkspaceOperationError(error, 'createFailed');
    } finally {
        drainWorkspacePublications(null);
    }
};

export const renameWorkspace = async (
    input: RenameWorkspaceInput,
): Promise<WorkspaceRenameResult> => {
    try {
        return await pioneerClient.workspaceRename({
            workspace_id: input.workspaceId,
            name: input.name,
        });
    } catch (error) {
        throw normalizeWorkspaceOperationError(error, 'renameFailed');
    } finally {
        drainWorkspacePublications(null);
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

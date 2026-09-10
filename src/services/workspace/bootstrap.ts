import { drainWorkspacePublications } from '@/client/workspaces';
import { pioneerClient } from '@/client';
import type { GatewayEndpoint, WorkspaceBootstrapSuccessReduction } from '@/client';
import { persistGatewayWorkspace } from '@/client/onboarding';
import { normalizeWorkspaceOperationError } from '@/services/workspace/management';

export type BootstrapActiveGatewayWorkspaceResult = {
    reduction: WorkspaceBootstrapSuccessReduction;
};

export const bootstrapActiveGatewayWorkspace = async (
    activeGateway: GatewayEndpoint,
): Promise<BootstrapActiveGatewayWorkspaceResult> => {
    try {
        const reduction = await pioneerClient.workspaceBootstrap({
            persisted_workspace_id: activeGateway.workspace_id ?? null,
        });
        await persistGatewayWorkspace(
            activeGateway.id,
            reduction.selected.persist_active_gateway_workspace_id ?? null,
        );

        return {
            reduction,
        };
    } catch (error) {
        throw normalizeWorkspaceOperationError(error, 'bootstrapFailed');
    } finally {
        drainWorkspacePublications(null);
    }
};

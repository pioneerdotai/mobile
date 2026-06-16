import { pioneerClient } from '@/client';
import type {
    GatewayEndpoint,
    GatewayRegistry,
    WorkspaceBootstrapSuccessReduction,
} from '@/client';
import { loadGatewayRegistry, saveGatewayRegistry } from '@/services/gateway/registry';
import { normalizeWorkspaceOperationError } from '@/services/workspace/management';

export type BootstrapActiveGatewayWorkspaceResult = {
    registry: GatewayRegistry;
    reduction: WorkspaceBootstrapSuccessReduction;
};

export const bootstrapActiveGatewayWorkspace = async (
    activeGateway: GatewayEndpoint,
): Promise<BootstrapActiveGatewayWorkspaceResult> => {
    try {
        const reduction = await pioneerClient.workspaceBootstrap({
            persisted_workspace_id: activeGateway.workspace_id ?? null,
        });
        const plan = await pioneerClient.gatewayPlanSetWorkspaceRegistry({
            registry: loadGatewayRegistry(),
            gateway_id: activeGateway.id,
            workspace_id: reduction.selected.persist_active_gateway_workspace_id,
        });

        saveGatewayRegistry(plan.registry);

        return {
            registry: plan.registry,
            reduction,
        };
    } catch (error) {
        throw normalizeWorkspaceOperationError(error, 'bootstrapFailed');
    }
};

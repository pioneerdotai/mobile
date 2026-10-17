import type { MobileStartupOutcome } from './mobile-startup';

export type StartupTreeScope = {
    gatewayId: string | null;
    connectionId: number | null;
    workspaceId: string | null;
};
export const sameStartupScope = (a: StartupTreeScope, b: StartupTreeScope): boolean =>
    a.gatewayId === b.gatewayId &&
    a.connectionId === b.connectionId &&
    a.workspaceId === b.workspaceId;

export type MobileStartupReadinessState = {
    registryBootstrapped: boolean;
    hasActiveGateway: boolean;
    authenticationRequired: boolean;
    terminalError: boolean;
    connected: boolean;
    scope: StartupTreeScope;
    workspaceBootstrappedConnectionId: number | null;
    workspaceExpectedConnectionId: number | null;
    workspaceLoading: boolean;
    treeLoading: boolean;
    appliedTreeScope: StartupTreeScope | null;
};

// Shell visibility has its own, earlier boundary in RootContent.
export const mobileStartupReadinessOutcome = (
    state: MobileStartupReadinessState,
): MobileStartupOutcome | null => {
    if (!state.registryBootstrapped) return null;
    if (!state.hasActiveGateway) return 'setup_required';
    if (state.authenticationRequired) return 'authentication_required';
    if (state.terminalError) return 'degraded';
    if (
        !state.connected ||
        state.scope.connectionId === null ||
        state.scope.workspaceId === null ||
        state.workspaceExpectedConnectionId === null ||
        state.workspaceBootstrappedConnectionId !== state.workspaceExpectedConnectionId ||
        state.workspaceLoading ||
        state.treeLoading ||
        !state.appliedTreeScope ||
        !sameStartupScope(state.scope, state.appliedTreeScope)
    )
        return null;
    return 'ready';
};

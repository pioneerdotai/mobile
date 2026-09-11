import type { MobileStartupOutcome } from './mobile-startup';

export type MobileStartupReadinessState = {
    registryBootstrapped: boolean;
    hasActiveGateway: boolean;
};

// Readiness means the local shell can be used, including switching gateways.
// Connection, authorization and workspace data load within that shell.
export const mobileStartupReadinessOutcome = (
    state: MobileStartupReadinessState,
): MobileStartupOutcome | null => {
    if (!state.registryBootstrapped) {
        return null;
    }
    return state.hasActiveGateway ? 'ready' : 'setup_required';
};

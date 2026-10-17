import type { ThreadOpeningRuntimeState } from './thread-opening-runtime';
import type { MobileStartupOutcome } from './mobile-startup';

export type ThreadOpeningReadiness = {
    focused: boolean;
    connected: boolean;
    composerBusy: boolean;
    snapshotMatches: boolean;
    composerMatches: boolean;
    screenLoading: boolean;
    screenError: boolean;
    authorizationReady: boolean;
    authorizationFailed: boolean;
    authorizationCancelled: boolean;
    composerDisabled: boolean;
    composerPolicyApplied: boolean;
    messageMode: boolean;
    modelSelectionComplete: boolean;
    modelSelectionLoading: boolean;
    runtimeState: ThreadOpeningRuntimeState;
};

// Empty text is intentionally absent: readiness does not require a send payload.
export const threadOpeningReadinessOutcome = (
    state: ThreadOpeningReadiness,
): MobileStartupOutcome | null => {
    if (!state.focused) return null;
    if (state.screenError || state.authorizationFailed) return 'degraded';
    if (state.authorizationCancelled) return 'cancelled';
    if (
        !state.connected ||
        state.composerBusy ||
        !state.snapshotMatches ||
        !state.composerMatches ||
        state.screenLoading ||
        !state.authorizationReady
    )
        return null;
    if (!state.messageMode && !state.composerPolicyApplied) return null;
    if (state.composerDisabled) return 'degraded';
    if (state.messageMode) return 'ready';
    if (state.runtimeState === 'cancelled' || state.runtimeState === 'degraded')
        return state.runtimeState;
    if (state.runtimeState === 'pending' || state.modelSelectionLoading) return null;
    if (state.runtimeState !== 'ready') return state.runtimeState;
    if (!state.modelSelectionComplete) return 'setup_required';
    return 'ready';
};

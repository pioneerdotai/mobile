import type { SessionTerminalReason } from '@/client';

import type { MobileStartupOutcome } from './mobile-startup';

const AUTHENTICATION_TERMINAL_REASONS = new Set<SessionTerminalReason>([
    'authentication_required',
    'session_revoked',
    'session_expired',
    'session_compromised',
    'refresh_credential_invalid',
]);

export type MobileStartupReadinessState = {
    registryBootstrapped: boolean;
    hasActiveGateway: boolean;
    connectionId: number | null;
    connectionState: string;
    sessionError: string | null;
    sessionTerminalReason: SessionTerminalReason | null;
    workspaceBootstrappedConnectionId: number | null;
    activeWorkspaceId: string | null;
    workspaceLoading: boolean;
    workspaceError: string | null;
    threadTreeWorkspaceId: string | null;
    threadTreeLoaded: boolean;
    threadTreeLoading: boolean;
    threadTreeError: string | null;
    composerSelectionLoading: boolean;
};

export const mobileStartupReadinessOutcome = (
    state: MobileStartupReadinessState,
): MobileStartupOutcome | null => {
    if (!state.registryBootstrapped) {
        return null;
    }
    if (!state.hasActiveGateway) {
        return 'setup_required';
    }
    if (state.sessionTerminalReason) {
        return AUTHENTICATION_TERMINAL_REASONS.has(state.sessionTerminalReason)
            ? 'authentication_required'
            : 'degraded';
    }
    if (state.connectionState === 'Disconnected' && state.sessionError) {
        return 'degraded';
    }
    if (state.connectionState !== 'Connected' || state.connectionId === null) {
        return null;
    }
    if (state.workspaceError || state.threadTreeError) {
        return 'degraded';
    }
    const workspaceReady =
        !state.workspaceLoading &&
        state.activeWorkspaceId !== null &&
        state.workspaceBootstrappedConnectionId === state.connectionId;
    const threadTreeReady =
        workspaceReady &&
        !state.threadTreeLoading &&
        state.threadTreeLoaded &&
        state.threadTreeWorkspaceId === state.activeWorkspaceId;
    if (!threadTreeReady || state.composerSelectionLoading) {
        return null;
    }
    // A completed lookup can legitimately resolve to no provider/model on a
    // fresh installation. The app is operational; only Composer submission
    // remains unavailable until the user makes a selection.
    return 'ready';
};

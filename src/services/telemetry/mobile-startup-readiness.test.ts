import { describe, expect, it } from '@jest/globals';

import { mobileStartupReadinessOutcome } from './mobile-startup-readiness';

describe('mobile startup readiness', () => {
    it('waits for the local gateway registry', () => {
        expect(
            mobileStartupReadinessOutcome({
                registryBootstrapped: false,
                hasActiveGateway: true,
            }),
        ).toBeNull();
    });

    it.each(['Connecting', 'Reconnecting', 'Disconnected', 'Connected'])(
        'reveals the shell while gateway is %s and remote data has not loaded',
        (connectionState) => {
            const state = {
                registryBootstrapped: true,
                hasActiveGateway: true,
                connectionState,
                connectionId: null,
                sessionError: null,
                sessionTerminalReason: null,
                workspaceBootstrappedConnectionId: null,
                activeWorkspaceId: null,
                workspaceLoading: true,
                workspaceError: null,
                threadTreeWorkspaceId: null,
                threadTreeLoaded: false,
                threadTreeLoading: true,
                threadTreeError: null,
                composerSelectionLoading: true,
            };
            expect(mobileStartupReadinessOutcome(state)).toBe('ready');
        },
    );

    it('reveals setup when no gateway has been selected', () => {
        expect(
            mobileStartupReadinessOutcome({
                registryBootstrapped: true,
                hasActiveGateway: false,
            }),
        ).toBe('setup_required');
    });
});

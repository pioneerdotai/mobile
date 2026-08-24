import { describe, expect, it } from '@jest/globals';

import {
    mobileStartupReadinessOutcome,
    type MobileStartupReadinessState,
} from './mobile-startup-readiness';

const readyState = (): MobileStartupReadinessState => ({
    registryBootstrapped: true,
    hasActiveGateway: true,
    connectionId: 7,
    connectionState: 'Connected',
    sessionError: null,
    sessionTerminalReason: null,
    workspaceBootstrappedConnectionId: 7,
    activeWorkspaceId: 'workspace-one',
    workspaceLoading: false,
    workspaceError: null,
    threadTreeWorkspaceId: 'workspace-one',
    threadTreeLoaded: true,
    threadTreeLoading: false,
    threadTreeError: null,
    composerSelectionLoading: false,
});

describe('mobile startup readiness', () => {
    it('waits for the complete connected working context', () => {
        expect(mobileStartupReadinessOutcome(readyState())).toBe('ready');
        expect(
            mobileStartupReadinessOutcome({ ...readyState(), threadTreeLoading: true }),
        ).toBeNull();
        expect(
            mobileStartupReadinessOutcome({ ...readyState(), composerSelectionLoading: true }),
        ).toBeNull();
    });

    it('is ready when composer selection resolves empty on a fresh installation', () => {
        const freshInstallationState = {
            ...readyState(),
            composerProvider: null,
            composerModel: null,
        };

        expect(mobileStartupReadinessOutcome(freshInstallationState)).toBe('ready');
    });

    it('uses bounded terminal outcomes for setup, authentication and failures', () => {
        expect(mobileStartupReadinessOutcome({ ...readyState(), hasActiveGateway: false })).toBe(
            'setup_required',
        );
        expect(
            mobileStartupReadinessOutcome({
                ...readyState(),
                sessionTerminalReason: 'authentication_required',
            }),
        ).toBe('authentication_required');
        expect(
            mobileStartupReadinessOutcome({
                ...readyState(),
                sessionTerminalReason: 'session_expired',
            }),
        ).toBe('authentication_required');
        expect(
            mobileStartupReadinessOutcome({
                ...readyState(),
                sessionTerminalReason: 'secure_storage_failed',
            }),
        ).toBe('degraded');
        expect(
            mobileStartupReadinessOutcome({
                ...readyState(),
                sessionTerminalReason: 'gateway_identity_mismatch',
            }),
        ).toBe('degraded');
        expect(
            mobileStartupReadinessOutcome({ ...readyState(), workspaceError: 'bootstrapFailed' }),
        ).toBe('degraded');
    });
});

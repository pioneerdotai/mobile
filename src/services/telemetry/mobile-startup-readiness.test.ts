import { describe, expect, it } from '@jest/globals';
import {
    mobileStartupReadinessOutcome,
    type MobileStartupReadinessState,
} from './mobile-startup-readiness';

const scope = { gatewayId: 'gateway', connectionId: 1, workspaceId: 'workspace' };
const ready: MobileStartupReadinessState = {
    registryBootstrapped: true,
    hasActiveGateway: true,
    authenticationRequired: false,
    terminalError: false,
    connected: true,
    scope,
    workspaceBootstrappedConnectionId: 1,
    workspaceExpectedConnectionId: 1,
    workspaceLoading: false,
    treeLoading: false,
    appliedTreeScope: scope,
};

describe('operational mobile startup', () => {
    it('does not treat a revealed shell or retained snapshot as a loaded tree', () => {
        expect(mobileStartupReadinessOutcome({ ...ready, connected: false })).toBeNull();
        expect(mobileStartupReadinessOutcome({ ...ready, appliedTreeScope: null })).toBeNull();
        expect(mobileStartupReadinessOutcome({ ...ready, registryBootstrapped: false })).toBeNull();
    });
    it('accepts a successfully applied empty tree without any composer input', () => {
        expect(mobileStartupReadinessOutcome(ready)).toBe('ready');
    });
    it('waits for current bootstrap, scope and mandatory initial loading', () => {
        expect(
            mobileStartupReadinessOutcome({ ...ready, workspaceBootstrappedConnectionId: 2 }),
        ).toBeNull();
        expect(
            mobileStartupReadinessOutcome({
                ...ready,
                appliedTreeScope: { ...scope, connectionId: 2 },
            }),
        ).toBeNull();
        expect(
            mobileStartupReadinessOutcome({
                ...ready,
                appliedTreeScope: { ...scope, workspaceId: 'other' },
            }),
        ).toBeNull();
        expect(mobileStartupReadinessOutcome({ ...ready, treeLoading: true })).toBeNull();
        expect(mobileStartupReadinessOutcome({ ...ready, workspaceLoading: true })).toBeNull();
    });
    it('reports setup, authentication and confirmed error branches', () => {
        expect(mobileStartupReadinessOutcome({ ...ready, hasActiveGateway: false })).toBe(
            'setup_required',
        );
        expect(mobileStartupReadinessOutcome({ ...ready, authenticationRequired: true })).toBe(
            'authentication_required',
        );
        expect(mobileStartupReadinessOutcome({ ...ready, terminalError: true })).toBe('degraded');
    });
});

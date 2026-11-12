import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

let mockValues: Record<string, { payload: any }>;
let mockWorkspace = 'workspace';
jest.mock('@/client/mobile-client-binding', () => ({ mobileClientBinding: {
    scope: (scope: { kind: string }) => ({
        getSnapshot: () => mockValues[scope.kind] ?? null,
        subscribe: () => () => {},
    }),
} }));
jest.mock('@/client', () => ({ mobileClientBinding: require('@/client/mobile-client-binding').mobileClientBinding }));
jest.mock('@/stores/workspace', () => ({ useWorkspaceStore: (select: any) => select({ activeWorkspaceId: mockWorkspace }) }));
// Exercise the real gateway store and mobileSessionProjection, not a synthetic connection selector.
const { useInboxScope } = require('./inbox-scope') as typeof import('./inbox-scope');
const { useGatewayStore } = require('@/stores/gateway') as typeof import('@/stores/gateway');
const metadata = { gateway_id: 'server', device_id: 'device', session_id: 'session', refresh_generation: 1, refresh_expires_at_unix: 4000 };
const connected = (transport: number) => ({ connection_id: transport, connection_generation: 4, metadata, access_expires_at_unix: 2000 });
beforeEach(() => {
    mockWorkspace = 'workspace';
    mockValues = {
        gateway_destinations: { payload: { selected_endpoint: 'remote', endpoints: [] } },
        session: { payload: {
            sessions: { remote: { kind: 'active', data: { metadata, connection_generation: 4 } } },
            connections: { remote: { presentation_connection_id: 1, connected: connected(1) } },
        } },
        administration: { payload: {
            endpoint_id: 'remote', connection_id: 1, connection_generation: 10,
            current_auth: { principal: { id: 'principal' }, session: { id: 'session' }, device: { id: 'device' } },
            workspace_snapshots: { workspace: { workspace: { capabilities: { can_read_own_notifications: true, can_acknowledge_own_notifications: true } } } },
        } },
    };
});
let scope: ReturnType<typeof useInboxScope>;
const Probe = () => { scope = useInboxScope(); return null; };
describe('inbox accepted-session scope', () => {
    it('retains inbox through transport 1 → 2 with presentation 1 and the same accepted subject', () => {
        let tree: ReactTestRenderer;
        act(() => { tree = create(<Probe />); });
        const initial = scope.key;
        expect(scope.enabled).toBe(true);
        mockValues.session = { payload: { ...mockValues.session.payload, connections: { remote: { presentation_connection_id: 1, connected: connected(2) } } } };
        mockValues.administration = { payload: { ...mockValues.administration.payload, connection_id: 2 } };
        act(() => tree!.update(<Probe />));
        expect(useGatewayStore.getState().connectionId).toBe(1);
        expect(useGatewayStore.getState().sessionConnectionGeneration).toBe(2);
        expect(scope.enabled).toBe(true);
        expect(scope.key).toBe(initial);
        act(() => tree!.unmount());
    });
    it.each(['endpoint', 'session', 'device', 'workspace', 'read', 'terminal'] as const)('blocks stale or unauthorized %s data', (change) => {
        let tree: ReactTestRenderer;
        act(() => { tree = create(<Probe />); });
        const initial = scope.key;
        const identity = mockValues.administration.payload;
        if (change === 'endpoint') identity.endpoint_id = 'other';
        if (change === 'session') identity.current_auth.session.id = 'other-session';
        if (change === 'device') identity.current_auth.device.id = 'other-device';
        if (change === 'workspace') mockWorkspace = 'other-workspace';
        if (change === 'read') identity.workspace_snapshots.workspace.workspace.capabilities.can_read_own_notifications = false;
        if (change === 'terminal') mockValues.session = { payload: { ...mockValues.session.payload, sessions: { remote: { kind: 'terminal', data: { metadata, reason: 'session_revoked' } } } } };
        mockValues.administration = { payload: { ...identity } };
        act(() => tree!.update(<Probe />));
        expect(scope.enabled).toBe(false);
        expect(scope.key).not.toBe(initial);
        act(() => tree!.unmount());
    });
    it.each(['principal', 'generation'] as const)('fences an accepted replacement of %s', (change) => {
        let tree: ReactTestRenderer;
        act(() => { tree = create(<Probe />); });
        const initial = scope.key;
        const identity = mockValues.administration.payload;
        if (change === 'principal') identity.current_auth.principal.id = 'next-principal';
        else identity.connection_generation++;
        mockValues.administration = { payload: { ...identity } };
        act(() => tree!.update(<Probe />));
        expect(scope.key).not.toBe(initial);
        act(() => tree!.unmount());
    });
});

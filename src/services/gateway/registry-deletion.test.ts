/* eslint-disable import/first */

import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/client', () => ({}));
jest.mock('@/services/client-diagnostics', () => ({
    captureClientDiagnosticsOnError: jest.fn(),
}));
jest.mock('@/storage', () => ({
    storage: {
        getString: jest.fn(),
        remove: jest.fn(),
        set: jest.fn(),
    },
}));

import type { DeleteRemoteGatewayRegistryPlan, GatewayEndpoint, GatewayRegistry } from '@/client';
import { commitRemoteGatewayDeletion } from './registry';

const endpoint = (): GatewayEndpoint => ({
    id: 'remote-1',
    name: 'Remote',
    address: 'wss://gateway.example/ws',
    kind: 'remote',
    session_ref: 'session-remote-1',
    server_gateway_id: 'G00000000000000000001',
    service_name: null,
    workspace_id: null,
});

const registry = (): GatewayRegistry => ({
    version: 2,
    installation_id: 'installation-mobile-1',
    active_gateway_id: null,
    local: null,
    remotes: [],
});

const plan = (): DeleteRemoteGatewayRegistryPlan => ({
    registry: registry(),
    endpoint: endpoint(),
    deleted_active: true,
    previous_active_gateway_id: 'remote-1',
    fallback_endpoint: null,
});

describe('remote Gateway session deletion', () => {
    it('removes the device session before committing the registry', async () => {
        const order: string[] = [];

        await commitRemoteGatewayDeletion(plan(), {
            deleteSession: async () => {
                order.push('session');
            },
            saveRegistry: () => {
                order.push('registry');
            },
        });

        expect(order).toEqual(['session', 'registry']);
    });

    it('retains the old registry pointer when credential deletion fails', async () => {
        const saveRegistry = jest.fn();

        await expect(
            commitRemoteGatewayDeletion(plan(), {
                deleteSession: async () => {
                    throw new Error('injected SecureStore failure');
                },
                saveRegistry,
            }),
        ).rejects.toThrow('injected SecureStore failure');

        expect(saveRegistry).not.toHaveBeenCalled();
    });

    it('reports a registry commit failure only after credentials are gone', async () => {
        const order: string[] = [];

        await expect(
            commitRemoteGatewayDeletion(plan(), {
                deleteSession: async () => {
                    order.push('session');
                },
                saveRegistry: () => {
                    order.push('registry');
                    throw new Error('injected registry failure');
                },
            }),
        ).rejects.toThrow('injected registry failure');

        expect(order).toEqual(['session', 'registry']);
    });
});

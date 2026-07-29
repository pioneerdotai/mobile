/* eslint-disable import/first */

import { describe, expect, it, jest } from '@jest/globals';

jest.mock('nanoid', () => ({ nanoid: jest.fn(() => 'installation0000000001') }));
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

import type { GatewayRegistry } from '@/client';
import {
    GatewayRegistryStorageError,
    defaultGatewayRegistry,
    normalizeStoredRegistry,
} from './registry';

const unboundRegistry = (): GatewayRegistry => ({
    version: 2,
    installation_id: 'installation-mobile-1',
    active_gateway_id: null,
    local: null,
    remotes: [],
});

const boundRemote = (
    id = 'remote-1',
    sessionRef = 'session-remote-1',
): NonNullable<GatewayRegistry['remotes']>[number] => ({
    id,
    name: 'Remote',
    address: 'wss://gateway.example/ws',
    kind: 'remote',
    session_ref: sessionRef,
    server_gateway_id: 'G00000000000000000001',
    service_name: null,
    workspace_id: null,
});

describe('Gateway session registry normalization', () => {
    it('creates only the current v2 registry shape', () => {
        expect(defaultGatewayRegistry()).toEqual({
            version: 2,
            installation_id: 'installation0000000001',
            active_gateway_id: null,
            local: null,
            remotes: [],
        });
    });

    it('preserves a complete uniquely-bound device session', () => {
        const normalized = normalizeStoredRegistry({
            ...unboundRegistry(),
            active_gateway_id: 'remote-1',
            remotes: [boundRemote()],
        });

        const remotes = normalized.remotes ?? [];
        expect(remotes[0]?.session_ref).toBe('session-remote-1');
        expect(remotes[0]?.server_gateway_id).toBe('G00000000000000000001');
    });

    it('does not accept the pre-session registry version', () => {
        expect(() =>
            normalizeStoredRegistry({
                ...unboundRegistry(),
                version: 1,
            }),
        ).toThrow(GatewayRegistryStorageError);
    });

    it.each([
        null,
        [],
        { ...unboundRegistry(), version: 99 },
        { ...unboundRegistry(), remotes: {} },
        { ...unboundRegistry(), remotes: [{ session_ref: 'session-remote-1' }] },
        { ...unboundRegistry(), active_gateway_id: { id: 'remote-1' } },
        {
            ...unboundRegistry(),
            remotes: [{ ...boundRemote(), server_gateway_id: null }],
        },
        {
            ...unboundRegistry(),
            remotes: [{ ...boundRemote(), session_ref: null }],
        },
        {
            ...unboundRegistry(),
            remotes: [
                boundRemote('remote-1', 'shared-session'),
                {
                    ...boundRemote('remote-2', 'shared-session'),
                    address: 'wss://gateway-2.example/ws',
                },
            ],
        },
        {
            ...unboundRegistry(),
            remotes: [
                boundRemote('duplicate-id', 'session-1'),
                {
                    ...boundRemote('duplicate-id', 'session-2'),
                    address: 'wss://gateway-2.example/ws',
                },
            ],
        },
        {
            ...unboundRegistry(),
            remotes: [{ ...boundRemote(), kind: 'local' }],
        },
        {
            ...unboundRegistry(),
            remotes: [
                {
                    ...boundRemote(),
                    unexpected_credential_field: 'must-fail-closed',
                },
            ],
        },
    ])('fails closed for a non-v2 or corrupted registry %#', (registry) => {
        expect(() => normalizeStoredRegistry(registry)).toThrow(GatewayRegistryStorageError);
    });
});

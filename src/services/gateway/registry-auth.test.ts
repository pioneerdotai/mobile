/* eslint-disable import/first */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('nanoid', () => ({ nanoid: jest.fn(() => 'installation0000000001') }));
jest.mock('@/client', () => ({
    pioneerClient: {
        gatewayLoadRegistryV3: jest.fn(),
    },
}));
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

import { pioneerClient } from '@/client';
import { storage } from '@/storage';
import { nanoid } from 'nanoid';
import {
    GatewayRegistryReconfigurationRequired,
    GatewayRegistryStorageError,
    defaultGatewayRegistry,
    loadGatewayRegistry,
    normalizeStoredRegistry,
} from './registry';

const canonicalRegistry = {
    version: 3,
    installation_id: 'installation-mobile-1',
    active_gateway_id: 'remote-1',
    local: null,
    remotes: [
        {
            id: 'remote-1',
            name: 'Remote',
            gateway_base_url: 'https://gateway.example/pioneer/',
            kind: 'remote' as const,
            session_ref: 'session-remote-1',
            server_gateway_id: 'G00000000000000000001',
            service_name: null,
            workspace_id: null,
        },
    ],
};

const mockLoad = jest.mocked(pioneerClient.gatewayLoadRegistryV3);
const mockGetString = jest.mocked(storage.getString);
const mockRemove = jest.mocked(storage.remove);
const mockSet = jest.mocked(storage.set);

describe('Gateway registry v3 native ownership', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(nanoid).mockReturnValue('installation0000000001');
    });

    it('creates only the current v3 registry shape', () => {
        expect(defaultGatewayRegistry()).toEqual({
            version: 3,
            installation_id: 'installation0000000001',
            active_gateway_id: null,
            local: null,
            remotes: [],
        });
    });

    it('accepts a canonical registry only through the native shared loader', () => {
        mockLoad.mockReturnValue({ state: 'current', registry: canonicalRegistry });

        expect(normalizeStoredRegistry(canonicalRegistry)).toEqual(canonicalRegistry);
        expect(mockLoad).toHaveBeenCalledWith({ document: JSON.stringify(canonicalRegistry) });
    });

    it('migrates an unambiguous v2 document once and persists only v3', () => {
        const legacyDocument = JSON.stringify({
            version: 2,
            installation_id: 'installation-mobile-1',
            active_gateway_id: null,
            local: null,
            remotes: [
                {
                    id: 'remote-1',
                    name: 'Remote',
                    address: 'https://gateway.example/',
                    kind: 'remote',
                },
            ],
        });
        mockGetString.mockImplementation((key) =>
            key === 'pioneer.gateway.registry.v2' ? legacyDocument : undefined,
        );
        mockLoad.mockReturnValue({ state: 'migrated', registry: canonicalRegistry });

        expect(loadGatewayRegistry()).toEqual(canonicalRegistry);
        expect(mockSet).toHaveBeenCalledWith(
            'pioneer.gateway.registry.v3',
            JSON.stringify(canonicalRegistry),
        );
        expect(mockRemove).toHaveBeenCalledWith('pioneer.gateway.registry.v2');
    });

    it('keeps an ambiguous v2 document intact and exposes reconfiguration state', () => {
        const legacyDocument = JSON.stringify({
            version: 2,
            remotes: [
                {
                    id: 'custom-endpoint',
                    name: 'Custom',
                    address: 'https://gateway.example/socket',
                    kind: 'remote',
                },
            ],
        });
        mockGetString.mockImplementation((key) =>
            key === 'pioneer.gateway.registry.v2' ? legacyDocument : undefined,
        );
        mockLoad.mockReturnValue({
            state: 'reconfiguration_required',
            endpoint_ids: ['custom-endpoint'],
        });

        expect(() => loadGatewayRegistry()).toThrow(GatewayRegistryReconfigurationRequired);
        expect(mockSet).not.toHaveBeenCalled();
        expect(mockRemove).not.toHaveBeenCalled();
    });

    it('wraps malformed native documents without persisting over them', () => {
        mockGetString.mockReturnValue('{not-json');
        mockLoad.mockImplementation(() => {
            throw new Error('invalid registry document');
        });

        expect(() => loadGatewayRegistry()).toThrow(GatewayRegistryStorageError);
        expect(mockSet).not.toHaveBeenCalled();
    });
});

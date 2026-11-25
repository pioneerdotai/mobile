import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { dispatchPackage } from './packages';
import { dispatchPlugin } from './plugins';
import { mobileClientBinding } from './mobile-client-binding';

jest.mock('./mobile-client-binding', () => ({
    mobileClientBinding: {
        dispatch: jest.fn(() => ({ outcome: 'changed' })),
        drain: jest.fn(),
    },
}));
jest.mock('@/stores/gateway', () => ({ useGatewayStore: jest.fn() }));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('package client scopes', () => {
    it('sends Apps actions to the Apps scope without draining plugins', () => {
        dispatchPackage('workspace', 42, { kind: 'observe', plugin_id: 'app-id' }, 'apps');
        expect(mobileClientBinding.dispatch).toHaveBeenCalledWith({
            schema_version: 1,
            intent: {
                kind: 'apps',
                workspace_id: 'workspace',
                connection_id: 42,
                intent: { kind: 'observe', plugin_id: 'app-id' },
            },
        });
        expect(mobileClientBinding.drain).toHaveBeenCalledTimes(1);
        expect(mobileClientBinding.drain).toHaveBeenCalledWith({ kind: 'apps', workspace_id: 'workspace' });
    });

    it('preserves the existing plugin dispatch adapter and scope', () => {
        dispatchPlugin('workspace', 42, { kind: 'observe', plugin_id: 'plugin-id' });
        expect(mobileClientBinding.dispatch).toHaveBeenCalledWith({
            schema_version: 1,
            intent: {
                kind: 'plugins',
                workspace_id: 'workspace',
                connection_id: 42,
                intent: { kind: 'observe', plugin_id: 'plugin-id' },
            },
        });
        expect(mobileClientBinding.drain).toHaveBeenCalledTimes(1);
        expect(mobileClientBinding.drain).toHaveBeenCalledWith({ kind: 'plugins', workspace_id: 'workspace' });
    });
});

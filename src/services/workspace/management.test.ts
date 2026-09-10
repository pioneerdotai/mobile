import { beforeEach, expect, it, jest } from '@jest/globals';
import type { GatewayEndpoint, WorkspaceCreateResult } from '@/client';
import { createWorkspace, renameWorkspace, switchActiveGatewayWorkspace } from './management';

const mockCreate = jest.fn<() => Promise<WorkspaceCreateResult>>();
const mockSwitch = jest.fn<() => Promise<{ status: 'noop' }>>();
const mockRename = jest.fn<() => Promise<{ status: 'unchanged' }>>();
const mockPersist = jest.fn<() => Promise<void>>();
const mockDrain = jest.fn();
jest.mock('@/client', () => ({
    pioneerClient: {
        workspaceCreate: (...args: []) => mockCreate(...args),
        workspaceSwitch: (...args: []) => mockSwitch(...args),
        workspaceRename: (...args: []) => mockRename(...args),
    },
    PioneerClientNativeError: class extends Error {},
}));
jest.mock('@/client/onboarding', () => ({
    persistGatewayWorkspace: (...args: []) => mockPersist(...args),
}));
jest.mock('@/client/workspaces', () => ({
    drainWorkspacePublications: (...args: unknown[]) => mockDrain(...args),
}));
jest.mock('@/services/gateway/transport-coordinator', () => ({
    runGatewayTransportTransition: (operation: () => Promise<unknown>) => operation(),
}));
const endpoint = {
    id: 'gateway',
    gateway_base_url: 'https://gateway.invalid',
    name: 'Synthetic',
    kind: 'remote',
} as GatewayEndpoint;
beforeEach(() => {
    jest.resetAllMocks();
    mockPersist.mockResolvedValue();
});
it('uses one shared create/select command and persists only its accepted selection', async () => {
    const result = {
        status: 'created',
        reduction: { switch_workspace_id: 'created' },
    } as WorkspaceCreateResult;
    mockCreate.mockResolvedValue(result);
    expect(await createWorkspace({ name: 'Created', activeGateway: endpoint })).toBe(result);
    expect(mockCreate).toHaveBeenCalledWith({ name: 'Created' });
    expect(mockSwitch).not.toHaveBeenCalled();
    expect(mockPersist).toHaveBeenCalledWith('gateway', 'created');
    expect(mockDrain).toHaveBeenCalledWith(null);
});
it('does not persist a rejected or failed operation or send a copied catalog to Rust', async () => {
    mockCreate.mockResolvedValue({ status: 'busy' });
    await createWorkspace({ name: 'Created', activeGateway: endpoint });
    expect(mockPersist).not.toHaveBeenCalled();
    mockCreate.mockRejectedValue(new Error('stale'));
    await expect(createWorkspace({ name: 'Created', activeGateway: endpoint })).rejects.toThrow(
        'createFailed',
    );
    expect(mockPersist).not.toHaveBeenCalled();
    mockSwitch.mockResolvedValue({ status: 'noop' });
    await switchActiveGatewayWorkspace({ activeGateway: endpoint, workspaceId: 'workspace' });
    expect(mockSwitch).toHaveBeenCalledWith({ workspace_id: 'workspace' });
    mockRename.mockResolvedValue({ status: 'unchanged' });
    await renameWorkspace({ workspaceId: 'workspace', name: 'Name' });
    expect(mockRename).toHaveBeenCalledWith({ workspace_id: 'workspace', name: 'Name' });
});

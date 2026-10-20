import { beforeEach, expect, it, jest } from '@jest/globals';
import type { GatewayEndpoint, WorkspaceCreateResult, pioneerClient } from '@/client';
import type { persistGatewayWorkspace } from '@/client/onboarding';
import { createWorkspace, renameWorkspace, switchActiveGatewayWorkspace } from './management';

const mockCreate = jest.fn<typeof pioneerClient.workspaceCreate>();
const mockSwitch = jest.fn<typeof pioneerClient.workspaceSwitch>();
const mockRename = jest.fn<typeof pioneerClient.workspaceRename>();
const mockPersist = jest.fn<typeof persistGatewayWorkspace>();
const mockDrain = jest.fn();
jest.mock('@/client', () => ({
    pioneerClient: {
        workspaceCreate: (...args: Parameters<typeof mockCreate>) => mockCreate(...args),
        workspaceSwitch: (...args: Parameters<typeof mockSwitch>) => mockSwitch(...args),
        workspaceRename: (...args: Parameters<typeof mockRename>) => mockRename(...args),
    },
    PioneerClientNativeError: class extends Error {},
}));
jest.mock('@/client/onboarding', () => ({
    persistGatewayWorkspace: (...args: Parameters<typeof mockPersist>) => mockPersist(...args),
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

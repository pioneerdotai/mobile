import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, jest } from '@jest/globals';
import type { ClientEvent } from '@/client';
import { applyActiveThreadEvent } from '@/services/threads/active';
import { administrationQueryKeys } from './query';
import { applyMobileAdministrationEvent, isAdministrationEvent } from './events';

jest.mock('@/client', () => ({
    pioneerClient: {
        administrationConflictRefetch: jest.fn(),
    },
}));
jest.mock('@/services/threads/active', () => ({ applyActiveThreadEvent: jest.fn() }));
jest.mock('@/stores/active-thread', () => ({
    useActiveThreadStore: { getState: () => ({ expandedKeys: [] }) },
}));

const event = (kind: string, params: Record<string, unknown> = {}): ClientEvent =>
    ({
        GatewayNotification: { kind, params },
    }) as ClientEvent;

describe('administration realtime invalidation', () => {
    it('recognizes only administration notifications', () => {
        expect(isAdministrationEvent(event('member_changed'))).toBe(true);
        expect(isAdministrationEvent(event('workspace_members_changed'))).toBe(true);
        expect(isAdministrationEvent(event('authorization_projection_changed'))).toBe(true);
        expect(isAdministrationEvent(event('turn_completed'))).toBe(false);
    });

    it('fail-closes every scoped capability cache on a policy generation event', async () => {
        const queryClient = new QueryClient();
        const epoch = { gatewayId: 'gateway-a', connectionId: 7 };
        const workspace = administrationQueryKeys.capabilities(epoch, 'workspace-a', null);
        const thread = administrationQueryKeys.capabilities(epoch, 'workspace-a', 'thread-a');
        queryClient.setQueryData(workspace, { authorization_revision: 6 });
        queryClient.setQueryData(thread, { authorization_revision: 6 });

        await applyMobileAdministrationEvent(
            event('authorization_projection_changed', {
                policy_generation: 7,
                change: 'role_policy',
                affected: { kind: 'role', role_key: 'member' },
            }),
            queryClient,
        );

        expect(queryClient.getQueryData(workspace)).toBeUndefined();
        expect(queryClient.getQueryData(thread)).toBeUndefined();
        expect(applyActiveThreadEvent).not.toHaveBeenCalled();
        queryClient.clear();
    });

    it('uses native revision filtering and invalidates only returned targets', async () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(administrationQueryKeys.invitations(), ['invite']);
        queryClient.setQueryData(administrationQueryKeys.members(), ['member']);
        jest.mocked(applyActiveThreadEvent).mockResolvedValue({
            administration_refetch: [{ kind: 'member_directory' }],
        } as never);

        await applyMobileAdministrationEvent(event('member_changed'), queryClient);

        expect(queryClient.getQueryState(administrationQueryKeys.members())?.isInvalidated).toBe(
            true,
        );
        expect(
            queryClient.getQueryState(administrationQueryKeys.invitations())?.isInvalidated,
        ).toBe(false);
        queryClient.clear();
    });

    it('refreshes auth/me when another session changes the current profile', async () => {
        const queryClient = new QueryClient();
        const queryKey = administrationQueryKeys.currentPrincipalForEpoch({
            gatewayId: 'gateway-a',
            connectionId: 7,
        });
        queryClient.setQueryData(queryKey, {
            principal: { id: 'P00000000000000000001' },
        });
        jest.mocked(applyActiveThreadEvent).mockResolvedValue({
            administration_refetch: [{ kind: 'member_directory' }],
        } as never);

        await applyMobileAdministrationEvent(
            event('member_changed', { principal_id: 'P00000000000000000001', revision: 1 }),
            queryClient,
        );

        expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
        queryClient.clear();
    });
});

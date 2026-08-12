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
        expect(isAdministrationEvent(event('turn_completed'))).toBe(false);
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

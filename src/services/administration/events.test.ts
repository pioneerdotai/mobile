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

const event = (kind: string): ClientEvent =>
    ({
        GatewayNotification: { kind, params: {} },
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
});

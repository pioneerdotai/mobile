import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ClientEvent } from '@/client';
import { applyActiveThreadEvent, openActiveThreadById } from '@/services/threads/active';
import { threadScopeQueryKeys } from '@/services/threads/scope';
import { timelineQueryKeys } from '@/services/threads/timeline-query';
import { administrationQueryKeys } from './query';
import { applyMobileAdministrationEvent, isAdministrationEvent } from './events';

jest.mock('@/client', () => ({
    pioneerClient: {
        administrationConflictRefetch: jest.fn(),
    },
}));
jest.mock('@/services/threads/active', () => ({
    applyActiveThreadEvent: jest.fn(),
    openActiveThreadById: jest.fn(),
}));
const mockActiveThreadState = {
    activeComposerThreadId: null as string | null,
    expandedKeys: [] as string[],
    reset: jest.fn(),
    resetDefaultComposerModelSelection: jest.fn(),
};
jest.mock('@/stores/active-thread', () => ({
    useActiveThreadStore: {
        getState: () => mockActiveThreadState,
    },
}));

const event = (kind: string, params: Record<string, unknown> = {}): ClientEvent =>
    ({
        GatewayNotification: { kind, params },
    }) as ClientEvent;

describe('administration realtime invalidation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(applyActiveThreadEvent).mockResolvedValue({
            snapshot: { thread_id: null },
        } as never);
        mockActiveThreadState.activeComposerThreadId = null;
        mockActiveThreadState.expandedKeys = [];
    });

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
        const threadScope = [...threadScopeQueryKeys.detail('thread-a'), epoch] as const;
        const timeline = timelineQueryKeys.threadSnapshot('thread-a');
        queryClient.setQueryData(workspace, { authorization_revision: 6 });
        queryClient.setQueryData(thread, { authorization_revision: 6 });
        queryClient.setQueryData(threadScope, { canManage: true });
        queryClient.setQueryData(timeline, { secret: 'old prompt' });

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
        expect(queryClient.getQueryData(threadScope)).toBeUndefined();
        expect(queryClient.getQueryData(timeline)).toBeUndefined();
        expect(applyActiveThreadEvent).toHaveBeenCalledTimes(1);
        queryClient.clear();
    });

    it('keeps thread projections intact for invitation-only authorization changes', async () => {
        const queryClient = new QueryClient();
        const timeline = timelineQueryKeys.threadSnapshot('thread-a');
        queryClient.setQueryData(timeline, { current: true });

        await applyMobileAdministrationEvent(
            event('authorization_projection_changed', {
                policy_generation: 8,
                change: 'resource_selector',
                affected: { scope: 'invitation', invitation_id: 'invite-a' },
            }),
            queryClient,
        );

        expect(queryClient.getQueryData(timeline)).toEqual({ current: true });
        expect(applyActiveThreadEvent).toHaveBeenCalledTimes(1);
        queryClient.clear();
    });

    it('reopens an active thread through current ACL after clearing the old generation', async () => {
        const queryClient = new QueryClient();
        const timeline = timelineQueryKeys.threadSnapshot('thread-a');
        queryClient.setQueryData(timeline, {
            thread_id: 'thread-a',
            projection: { revision: 6 },
            secret: 'old prompt',
        });
        mockActiveThreadState.activeComposerThreadId = 'thread-a';
        mockActiveThreadState.expandedKeys = ['turn:expanded'];
        jest.mocked(openActiveThreadById).mockResolvedValue({
            thread_id: 'thread-a',
            projection: { revision: 8 },
            pending_requests: [],
        } as never);

        await applyMobileAdministrationEvent(
            event('authorization_projection_changed', {
                policy_generation: 8,
                change: 'role_assignment',
                affected: {
                    scope: 'principal',
                    principal_id: 'P00000000000000000001',
                },
            }),
            queryClient,
        );

        expect(openActiveThreadById).toHaveBeenCalledWith({
            thread_id: 'thread-a',
            expanded_keys: ['turn:expanded'],
        });
        expect(queryClient.getQueryData(timeline)).toEqual({
            thread_id: 'thread-a',
            projection: { revision: 8 },
            pending_requests: [],
        });
        expect(mockActiveThreadState.reset).not.toHaveBeenCalled();
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

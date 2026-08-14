import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, jest } from '@jest/globals';

import { pioneerClient } from '@/client';
import type { AuthorizationCapabilitySnapshot } from '@/client';

import {
    administrationAuthorizationQueryRetry,
    administrationAuthorizationQueryRetryDelay,
    administrationConflictRefetch,
    administrationQueryKeys,
    clearAdministrationQueries,
    invalidateAdministrationTargets,
    invalidateMaterializedThreadAuthorization,
    reconcileAuthorizationCapabilityQueries,
} from './query';

jest.mock('@/client', () => ({
    pioneerClient: { administrationConflictRefetch: jest.fn() },
}));

describe('administration query ownership', () => {
    it('scopes authorization snapshots to the connection epoch and workspace', () => {
        const firstEpoch = { gatewayId: 'gateway-a', connectionId: 1 } as const;
        const secondEpoch = { gatewayId: 'gateway-a', connectionId: 2 } as const;

        expect(administrationQueryKeys.capabilities(firstEpoch, 'workspace-a')).not.toEqual(
            administrationQueryKeys.capabilities(secondEpoch, 'workspace-a'),
        );
        expect(administrationQueryKeys.capabilities(firstEpoch, 'workspace-a')).not.toEqual(
            administrationQueryKeys.capabilities(firstEpoch, 'workspace-b'),
        );
    });

    it('retries transient authorization reads with bounded backoff', () => {
        expect(administrationAuthorizationQueryRetry(0, new Error('temporary'))).toBe(true);
        expect(administrationAuthorizationQueryRetry(3, new Error('temporary'))).toBe(true);
        expect(administrationAuthorizationQueryRetry(4, new Error('temporary'))).toBe(false);
        expect(administrationAuthorizationQueryRetryDelay(0)).toBe(100);
        expect(administrationAuthorizationQueryRetryDelay(1)).toBe(250);
        expect(administrationAuthorizationQueryRetryDelay(2)).toBe(500);
        expect(administrationAuthorizationQueryRetryDelay(10)).toBe(1_000);
    });

    it('does not retry terminal sessions or incompatible capability contracts', () => {
        expect(
            administrationAuthorizationQueryRetry(0, {
                code: 'session_revoked',
            }),
        ).toBe(false);
        expect(
            administrationAuthorizationQueryRetry(
                0,
                new Error('incompatible_authorization_capability_snapshot'),
            ),
        ).toBe(false);
    });

    it('delegates conflicted-action policy to shared Rust', () => {
        jest.mocked(pioneerClient.administrationConflictRefetch).mockReturnValue([
            { kind: 'member_directory' },
        ]);
        const action = { kind: 'suspend_member', principal_id: 'principal-a' } as const;
        expect(administrationConflictRefetch(action)).toEqual([{ kind: 'member_directory' }]);
        expect(pioneerClient.administrationConflictRefetch).toHaveBeenCalledWith(action);
    });

    it('invalidates only the requested scoped snapshots', async () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(administrationQueryKeys.invitations(), ['invite']);
        queryClient.setQueryData(administrationQueryKeys.members(), ['member']);
        queryClient.setQueryData(administrationQueryKeys.workspaceMembers('workspace-a'), ['a']);
        queryClient.setQueryData(administrationQueryKeys.workspaceMembers('workspace-b'), ['b']);

        await invalidateAdministrationTargets(queryClient, [
            { kind: 'workspace_members', workspace_id: 'workspace-a' },
        ]);

        expect(
            queryClient.getQueryState(administrationQueryKeys.workspaceMembers('workspace-a'))
                ?.isInvalidated,
        ).toBe(true);
        expect(
            queryClient.getQueryState(administrationQueryKeys.workspaceMembers('workspace-b'))
                ?.isInvalidated,
        ).toBe(false);
        expect(
            queryClient.getQueryState(administrationQueryKeys.invitations())?.isInvalidated,
        ).toBe(false);
        queryClient.clear();
    });

    it('refreshes only the materialized draft thread capability entry', async () => {
        const queryClient = new QueryClient();
        const epoch = { gatewayId: 'gateway-a', connectionId: 7 } as const;
        const materialized = administrationQueryKeys.capabilities(epoch, 'workspace-a', 'thread-a');
        const sibling = administrationQueryKeys.capabilities(epoch, 'workspace-a', 'thread-b');
        const otherConnection = administrationQueryKeys.capabilities(
            { gatewayId: 'gateway-a', connectionId: 8 },
            'workspace-a',
            'thread-a',
        );
        queryClient.setQueryData(materialized, { workspace: {}, thread: null });
        queryClient.setQueryData(sibling, { workspace: {}, thread: {} });
        queryClient.setQueryData(otherConnection, { workspace: {}, thread: {} });

        await invalidateMaterializedThreadAuthorization(
            queryClient,
            epoch,
            'workspace-a',
            'thread-a',
        );

        expect(queryClient.getQueryState(materialized)?.isInvalidated).toBe(true);
        expect(queryClient.getQueryState(sibling)?.isInvalidated).toBe(false);
        expect(queryClient.getQueryState(otherConnection)?.isInvalidated).toBe(false);
        queryClient.clear();
    });

    it('publishes a newer workspace revision and evicts older scoped projections atomically', () => {
        const queryClient = new QueryClient();
        const epoch = { gatewayId: 'gateway-a', connectionId: 7 } as const;
        const threadA = administrationQueryKeys.capabilities(epoch, 'workspace-a', 'thread-a');
        const threadB = administrationQueryKeys.capabilities(epoch, 'workspace-a', 'thread-b');
        const source = administrationQueryKeys.capabilities(epoch, 'workspace-a', 'thread-c');
        const otherEpoch = administrationQueryKeys.capabilities(
            { gatewayId: 'gateway-a', connectionId: 8 },
            'workspace-a',
            'thread-a',
        );
        queryClient.setQueryData(threadA, { authorization_revision: 7 });
        queryClient.setQueryData(threadB, { authorization_revision: 8 });
        queryClient.setQueryData(source, { authorization_revision: 8 });
        queryClient.setQueryData(otherEpoch, { authorization_revision: 1 });
        const snapshot = {
            schema_version: 5,
            authorization_revision: 9,
            principal_id: 'P00000000000000000001',
            role_key: 'future_role',
            role: {
                key: 'future_role',
                display_name: 'Future role',
                description: 'Test role',
                built_in: false,
            },
            global: {},
            workspace: { workspace_id: 'workspace-a' },
            thread: { workspace_id: 'workspace-a', thread_id: 'thread-c' },
        } as AuthorizationCapabilitySnapshot;

        reconcileAuthorizationCapabilityQueries(queryClient, epoch, source, snapshot);

        expect(queryClient.getQueryData(threadA)).toBeUndefined();
        expect(queryClient.getQueryData(threadB)).toBeUndefined();
        expect(queryClient.getQueryData(source)).toEqual({ authorization_revision: 8 });
        expect(queryClient.getQueryData(otherEpoch)).toEqual({ authorization_revision: 1 });
        expect(
            queryClient.getQueryData(
                administrationQueryKeys.capabilities(epoch, 'workspace-a', null),
            ),
        ).toEqual({ ...snapshot, thread: null });
        queryClient.clear();
    });

    it('clears every administration snapshot at a terminal session boundary', async () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(administrationQueryKeys.members(), ['member']);
        await clearAdministrationQueries(queryClient);
        expect(queryClient.getQueriesData({ queryKey: administrationQueryKeys.all })).toEqual([]);
        queryClient.clear();
    });
});

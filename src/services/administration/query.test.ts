import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, jest } from '@jest/globals';

import { pioneerClient } from '@/client';

import {
    administrationConflictRefetch,
    administrationQueryKeys,
    clearAdministrationQueries,
    invalidateAdministrationTargets,
} from './query';

jest.mock('@/client', () => ({
    pioneerClient: { administrationConflictRefetch: jest.fn() },
}));

describe('administration query ownership', () => {
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

    it('clears every administration snapshot at a terminal session boundary', async () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(administrationQueryKeys.members(), ['member']);
        await clearAdministrationQueries(queryClient);
        expect(queryClient.getQueriesData({ queryKey: administrationQueryKeys.all })).toEqual([]);
        queryClient.clear();
    });
});

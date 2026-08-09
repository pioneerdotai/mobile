import type { QueryClient } from '@tanstack/react-query';

import { pioneerClient, type AdministrationAction, type AdministrationRefetch } from '@/client';

type AdministrationQueryRoot = 'administration';

export const administrationQueryKeys = {
    all: ['administration'] as const satisfies readonly [AdministrationQueryRoot],
    currentPrincipal: () => [...administrationQueryKeys.all, 'current-principal'] as const,
    invitations: () => [...administrationQueryKeys.all, 'invitations'] as const,
    members: () => [...administrationQueryKeys.all, 'members'] as const,
    member: (principalId: string) =>
        [...administrationQueryKeys.members(), { principalId }] as const,
    workspaceMembers: (workspaceId: string) =>
        [...administrationQueryKeys.all, 'workspace-members', { workspaceId }] as const,
};

/** One mutation lane prevents two destructive administration actions from
 * racing in different screens. Gateway preconditions remain authoritative. */
export const administrationMutationKey = ['administration', 'action'] as const;

export const administrationConflictRefetch = (
    action: AdministrationAction,
): AdministrationRefetch[] => pioneerClient.administrationConflictRefetch(action);

export const invalidateAdministrationTargets = async (
    queryClient: QueryClient,
    targets: readonly AdministrationRefetch[],
): Promise<void> => {
    await Promise.all(
        targets.map((target) => {
            switch (target.kind) {
                case 'invitation_list':
                    return queryClient.invalidateQueries({
                        queryKey: administrationQueryKeys.invitations(),
                    });
                case 'member_directory':
                    return queryClient.invalidateQueries({
                        queryKey: administrationQueryKeys.members(),
                    });
                case 'workspace_members':
                    return queryClient.invalidateQueries({
                        queryKey: administrationQueryKeys.workspaceMembers(target.workspace_id),
                    });
            }
        }),
    );
};

export const clearAdministrationQueries = async (queryClient: QueryClient): Promise<void> => {
    const cancellation = queryClient.cancelQueries({ queryKey: administrationQueryKeys.all });
    queryClient.removeQueries({ queryKey: administrationQueryKeys.all });
    await cancellation;
};

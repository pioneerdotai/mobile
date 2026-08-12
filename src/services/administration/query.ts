import { queryOptions, type QueryClient } from '@tanstack/react-query';

import { pioneerClient, type AdministrationAction, type AdministrationRefetch } from '@/client';
import {
    loadAuthorizationCapabilitySnapshot,
    loadCurrentAdministrationPrincipal,
} from '@/services/administration/invitations';

type AdministrationQueryRoot = 'administration';

export type AdministrationAuthorizationEpoch = Readonly<{
    gatewayId: string | null;
    connectionId: number | null;
}>;

const authorizationEpochKey = (epoch: AdministrationAuthorizationEpoch) => ({
    gatewayId: epoch.gatewayId,
    connectionId: epoch.connectionId,
});

export const administrationQueryKeys = {
    all: ['administration'] as const satisfies readonly [AdministrationQueryRoot],
    currentPrincipal: () => [...administrationQueryKeys.all, 'current-principal'] as const,
    currentPrincipalForEpoch: (epoch: AdministrationAuthorizationEpoch) =>
        [...administrationQueryKeys.currentPrincipal(), authorizationEpochKey(epoch)] as const,
    capabilities: (
        epoch: AdministrationAuthorizationEpoch,
        workspaceId: string | null,
        threadId: string | null = null,
    ) =>
        [
            ...administrationQueryKeys.all,
            'capabilities',
            authorizationEpochKey(epoch),
            { workspaceId, threadId },
        ] as const,
    invitations: () => [...administrationQueryKeys.all, 'invitations'] as const,
    members: () => [...administrationQueryKeys.all, 'members'] as const,
    member: (principalId: string) =>
        [...administrationQueryKeys.members(), { principalId }] as const,
    workspaceMembers: (workspaceId: string) =>
        [...administrationQueryKeys.all, 'workspace-members', { workspaceId }] as const,
};

const AUTHORIZATION_QUERY_MAX_RETRIES = 4;
const NON_RETRYABLE_AUTHORIZATION_ERROR_CODES = new Set([
    'gateway_identity_mismatch',
    'invalid_capability_scope',
    'invalid_credential',
    'session_compromised',
    'session_expired',
    'session_revoked',
]);

const errorCode = (error: unknown): string | null => {
    if (!error || typeof error !== 'object' || !('code' in error)) return null;
    const code = error.code;
    return typeof code === 'string' ? code : null;
};

export const administrationAuthorizationQueryRetry = (
    failureCount: number,
    error: unknown,
): boolean => {
    if (
        error instanceof Error &&
        error.message === 'incompatible_authorization_capability_snapshot'
    ) {
        return false;
    }
    const code = errorCode(error);
    if (code && NON_RETRYABLE_AUTHORIZATION_ERROR_CODES.has(code)) {
        return false;
    }
    return failureCount < AUTHORIZATION_QUERY_MAX_RETRIES;
};

export const administrationAuthorizationQueryRetryDelay = (attemptIndex: number): number =>
    [100, 250, 500, 1_000][Math.min(attemptIndex, 3)] ?? 1_000;

export const currentAdministrationPrincipalQueryOptions = (
    epoch: AdministrationAuthorizationEpoch,
) =>
    queryOptions({
        queryKey: administrationQueryKeys.currentPrincipalForEpoch(epoch),
        queryFn: loadCurrentAdministrationPrincipal,
        retry: administrationAuthorizationQueryRetry,
        retryDelay: administrationAuthorizationQueryRetryDelay,
        staleTime: 30_000,
    });

export const authorizationCapabilitySnapshotQueryOptions = (
    epoch: AdministrationAuthorizationEpoch,
    workspaceId: string | null,
    threadId: string | null = null,
) =>
    queryOptions({
        queryKey: administrationQueryKeys.capabilities(epoch, workspaceId, threadId),
        queryFn: () => loadAuthorizationCapabilitySnapshot(workspaceId, threadId),
        retry: administrationAuthorizationQueryRetry,
        retryDelay: administrationAuthorizationQueryRetryDelay,
        staleTime: 30_000,
    });

/** A live draft keeps its future persisted thread id, so the query key does
 * not change when the first turn materializes the thread. Invalidate that
 * exact scoped entry to replace the workspace-only draft snapshot with the
 * authoritative thread capabilities immediately. */
export const invalidateMaterializedThreadAuthorization = (
    queryClient: QueryClient,
    epoch: AdministrationAuthorizationEpoch,
    workspaceId: string,
    threadId: string,
): Promise<void> =>
    queryClient.invalidateQueries({
        queryKey: administrationQueryKeys.capabilities(epoch, workspaceId, threadId),
        exact: true,
    });

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

import { queryOptions, type QueryClient, type QueryKey } from '@tanstack/react-query';

import {
    pioneerClient,
    type AdministrationAction,
    type AdministrationRefetch,
    type AuthorizationCapabilitySnapshot,
} from '@/client';
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
const NON_RETRYABLE_AUTHORIZATION_PROJECTION_ERRORS = new Set([
    'conflicting_authorization_projection',
    'incompatible_authorization_capability_snapshot',
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
        NON_RETRYABLE_AUTHORIZATION_PROJECTION_ERRORS.has(error.message)
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

export const acceptAuthorizationCapabilitySnapshot = (
    epoch: AdministrationAuthorizationEpoch,
    expectedPrincipalId: string,
    workspaceId: string | null,
    threadId: string | null,
    snapshot: AuthorizationCapabilitySnapshot,
): AuthorizationCapabilitySnapshot => {
    if (epoch.gatewayId === null || epoch.connectionId === null) {
        throw new Error('inactive_authorization_connection_epoch');
    }
    const accepted = pioneerClient.authorizationProjectionAccept({
        gateway_id: epoch.gatewayId,
        connection_id: epoch.connectionId,
        expected_principal_id: expectedPrincipalId,
        workspace_id: workspaceId,
        thread_id: threadId,
        snapshot,
    });
    if (accepted.acceptance === 'incompatible') {
        throw new Error('incompatible_authorization_capability_snapshot');
    }
    if (accepted.acceptance === 'conflict') {
        throw new Error('conflicting_authorization_projection');
    }
    if (accepted.acceptance === 'stale' || !accepted.snapshot) {
        throw new Error('stale_authorization_projection');
    }
    return accepted.snapshot;
};

export const authorizationCapabilitySnapshotQueryOptions = (
    queryClient: QueryClient,
    epoch: AdministrationAuthorizationEpoch,
    expectedPrincipalId: string,
    workspaceId: string | null,
    threadId: string | null = null,
) => {
    const queryKey = administrationQueryKeys.capabilities(epoch, workspaceId, threadId);
    // The query identity is the immutable Gateway connection epoch plus exact
    // resource scope. `expectedPrincipalId` is an integrity assertion for that
    // epoch; `queryClient` and `queryKey` only reconcile sibling projections
    // after the response is accepted.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- non-identity integrity and cache dependencies
    return queryOptions({
        queryKey,
        queryFn: async () => {
            if (epoch.gatewayId === null || epoch.connectionId === null) {
                throw new Error('inactive_authorization_connection_epoch');
            }
            const raw = await loadAuthorizationCapabilitySnapshot(workspaceId, threadId);
            const snapshot = acceptAuthorizationCapabilitySnapshot(
                epoch,
                expectedPrincipalId,
                workspaceId,
                threadId,
                raw,
            );
            reconcileAuthorizationCapabilityQueries(queryClient, epoch, queryKey, snapshot);
            return snapshot;
        },
        retry: administrationAuthorizationQueryRetry,
        retryDelay: administrationAuthorizationQueryRetryDelay,
        staleTime: 30_000,
    });
};

const sameQueryKey = (left: QueryKey, right: QueryKey): boolean =>
    JSON.stringify(left) === JSON.stringify(right);

/** Reconcile all React Query views with the native revision fence before the
 * newly fetched scope becomes observable. A newer scoped response replaces
 * the workspace projection and evicts every older thread projection; same-
 * revision scopes can coexist because the native store already rejected
 * conflicting manifests. */
export const reconcileAuthorizationCapabilityQueries = (
    queryClient: QueryClient,
    epoch: AdministrationAuthorizationEpoch,
    sourceQueryKey: QueryKey,
    snapshot: AuthorizationCapabilitySnapshot,
): void => {
    const prefix = [
        ...administrationQueryKeys.all,
        'capabilities',
        authorizationEpochKey(epoch),
    ] as const;
    const workspaceId = snapshot.workspace?.workspace_id ?? null;
    if (workspaceId) {
        queryClient.setQueryData(administrationQueryKeys.capabilities(epoch, workspaceId, null), {
            ...snapshot,
            thread: null,
        });
    }

    for (const query of queryClient.getQueryCache().findAll({ queryKey: prefix })) {
        if (sameQueryKey(query.queryKey, sourceQueryKey)) continue;
        const current = query.state.data as AuthorizationCapabilitySnapshot | undefined;
        if (!current || current.authorization_revision >= snapshot.authorization_revision) {
            continue;
        }
        if (
            workspaceId &&
            sameQueryKey(
                query.queryKey,
                administrationQueryKeys.capabilities(epoch, workspaceId, null),
            )
        ) {
            continue;
        }
        void queryClient.cancelQueries({ queryKey: query.queryKey, exact: true });
        queryClient.removeQueries({ queryKey: query.queryKey, exact: true });
    }
};

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

/**
 * Applies the server-owned authorization generation fence to every scoped
 * React Query adapter. The native projection store has already discarded the
 * previous generation before the event reaches JavaScript; resetting all
 * capability entries keeps the shell from exposing an independently cached
 * workspace or thread projection from that previous generation. Active
 * consumers refetch immediately, while inactive scopes remain unavailable
 * until explicitly opened.
 */
export const resetAuthorizationCapabilityQueries = async (
    queryClient: QueryClient,
): Promise<void> => {
    const capabilities = (query: { queryKey: QueryKey }) =>
        query.queryKey[0] === administrationQueryKeys.all[0] &&
        query.queryKey[1] === 'capabilities';
    await queryClient.cancelQueries({
        queryKey: administrationQueryKeys.all,
        predicate: capabilities,
    });
    await queryClient.resetQueries({
        queryKey: administrationQueryKeys.all,
        predicate: capabilities,
    });
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

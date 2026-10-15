import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { mobileClientBinding, pioneerClient } from '@/client';
import type { IdentityAuthorizationPublication } from '@/client/generated/identity_authorization_publication';
import { useWorkspaceStore } from '@/stores/workspace';

const useIdentity = () => {
    const store = mobileClientBinding.scope({ kind: 'administration', workspace_id: null });
    const value = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return value?.payload as IdentityAuthorizationPublication | null;
};
export const useAdministrationPrincipal = () => {
    const identity = useIdentity();
    const data = identity?.current_auth ?? undefined;
    const refetch = useCallback(async () => {
        await pioneerClient.gatewayAuthMe();
        await mobileClientBinding.synchronize();
    }, []);
    return {
        data,
        error: identity?.identity_error ?? null,
        isError: Boolean(identity?.identity_error),
        isPending: !data && !identity?.identity_error,
        isFetching: Boolean(identity?.identity_loading),
        refetch,
    };
};
export const useAuthorizationCapabilitySnapshot = (threadId: string | null = null) => {
    const identity = useIdentity();
    const workspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const data = threadId
        ? identity?.thread_snapshots?.[threadId]
        : workspaceId
          ? identity?.workspace_snapshots?.[workspaceId]
          : undefined;
    const refetch = useCallback(async () => {
        if (!workspaceId) return;
        await pioneerClient.gatewayAuthorizationCapabilities({
            workspace_id: workspaceId,
            thread_id: threadId,
        });
        await mobileClientBinding.synchronize();
    }, [workspaceId, threadId]);
    const read = identity?.capability_reads.find(
        (read) =>
            (read.workspace_id ?? null) === workspaceId && (read.thread_id ?? null) === threadId,
    );
    const connected = identity?.connection_id != null;
    useEffect(() => {
        if (connected) void refetch().catch(() => undefined);
    }, [
        connected,
        identity?.connection_generation,
        identity?.authorization_change_sequence,
        refetch,
    ]);
    return {
        data,
        error: read?.error ?? null,
        isError: Boolean(read?.error),
        isPending: !data && !read?.error,
        isFetching: Boolean(read?.loading),
        refetch,
    };
};
export const useAdministrationCapabilities = () => {
    const query = useAuthorizationCapabilitySnapshot();
    const data = useMemo(
        () =>
            query.data ? pioneerClient.principalPresentationCapabilities(query.data) : undefined,
        [query.data],
    );
    return { ...query, capabilitySnapshot: query.data, data };
};
export const useCurrentPrincipalPresentation = () => {
    const principal = useAdministrationPrincipal();
    const capabilities = useAuthorizationCapabilitySnapshot();
    const data = useMemo(
        () =>
            principal.data && capabilities.data
                ? pioneerClient.currentPrincipalPresentation({
                      auth: principal.data,
                      capability_snapshot: capabilities.data,
                  })
                : undefined,
        [principal.data, capabilities.data],
    );
    return {
        ...principal,
        data,
        isPending: !data,
        refetch: async () => Promise.all([principal.refetch(), capabilities.refetch()]),
    };
};

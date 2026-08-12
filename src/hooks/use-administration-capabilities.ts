import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { pioneerClient } from '@/client';
import {
    authorizationCapabilitySnapshotQueryOptions,
    currentAdministrationPrincipalQueryOptions,
    type AdministrationAuthorizationEpoch,
} from '@/services/administration/query';
import { useGatewayStore } from '@/stores/gateway';
import { useWorkspaceStore } from '@/stores/workspace';

const useAdministrationAuthorizationEpoch = () => {
    const { connectionGatewayId, connectionId, connectionState } = useGatewayStore(
        useShallow((state) => ({
            connectionGatewayId: state.connectionGatewayId,
            connectionId: state.connectionId,
            connectionState: state.connectionState,
        })),
    );
    const epoch = useMemo<AdministrationAuthorizationEpoch>(
        () => ({ gatewayId: connectionGatewayId, connectionId }),
        [connectionGatewayId, connectionId],
    );
    return {
        epoch,
        enabled:
            connectionState === 'Connected' &&
            connectionGatewayId !== null &&
            connectionId !== null,
    };
};

export const useAuthorizationCapabilitySnapshot = (threadId: string | null = null) => {
    const { enabled, epoch } = useAdministrationAuthorizationEpoch();
    const workspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    return useQuery({
        ...authorizationCapabilitySnapshotQueryOptions(epoch, workspaceId, threadId),
        enabled: enabled && (threadId === null || workspaceId !== null),
    });
};

export const useAdministrationCapabilities = () => {
    const query = useAuthorizationCapabilitySnapshot();
    return {
        ...query,
        capabilitySnapshot: query.data,
        data: query.data ? pioneerClient.principalPresentationCapabilities(query.data) : undefined,
    };
};

/** Resource-scoped operational capabilities for an active thread. Internal
 * task/subagent threads are resolved by the Gateway through persisted root
 * lineage; the client never infers that inheritance locally. */
export const useThreadAuthorizationCapabilities = (threadId: string | null) =>
    useAuthorizationCapabilitySnapshot(threadId);

export const useAdministrationPrincipal = () => {
    const { enabled, epoch } = useAdministrationAuthorizationEpoch();
    return useQuery({
        ...currentAdministrationPrincipalQueryOptions(epoch),
        enabled,
    });
};

export const useCurrentPrincipalPresentation = () => {
    const principal = useAdministrationPrincipal();
    const capabilitySnapshot = useAuthorizationCapabilitySnapshot();
    const presentation = useMemo(() => {
        if (!principal.data || !capabilitySnapshot.data) {
            return { data: undefined, error: null };
        }
        try {
            return {
                data: pioneerClient.currentPrincipalPresentation({
                    auth: principal.data,
                    capability_snapshot: capabilitySnapshot.data,
                }),
                error: null,
            };
        } catch (error) {
            return { data: undefined, error };
        }
    }, [capabilitySnapshot.data, principal.data]);

    return {
        data: presentation.data,
        error: presentation.error ?? principal.error ?? capabilitySnapshot.error,
        isError: presentation.error !== null || principal.isError || capabilitySnapshot.isError,
        isFetching: principal.isFetching || capabilitySnapshot.isFetching,
        isPending: principal.isPending || capabilitySnapshot.isPending,
        refetch: async () => Promise.all([principal.refetch(), capabilitySnapshot.refetch()]),
    };
};

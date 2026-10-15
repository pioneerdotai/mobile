import { useCallback, useEffect, useSyncExternalStore } from 'react';

import type { RuntimeSummary } from '@/client';
import { mobileClientBinding } from '@/client/mobile-client-binding';
import type { IdentityAuthorizationPublication } from '@/client/generated/identity_authorization_publication';
import {
    cliRuntimeSummariesSnapshot,
    loadCliRuntimeSummariesInBackground,
    subscribeCliRuntimeSummaries,
} from '@/services/providers/cli-runtime-snapshot';

export const useCliRuntimeSummaries = (
    workspaceId: string | null | undefined,
): readonly RuntimeSummary[] => {
    const identityStore = mobileClientBinding.scope({ kind: 'administration', workspace_id: null });
    const identitySnapshot = useSyncExternalStore(
        identityStore.subscribe,
        identityStore.getSnapshot,
        identityStore.getSnapshot,
    );
    const identity = identitySnapshot?.payload as IdentityAuthorizationPublication | null;
    const authenticated = identity?.current_auth != null;
    const connection = identity?.connection_generation;
    const authorization = identity?.authorization_change_sequence;
    useEffect(() => {
        if (workspaceId && authenticated) {
            loadCliRuntimeSummariesInBackground(workspaceId);
        }
    }, [workspaceId, authenticated, connection, authorization]);

    const subscribe = useCallback(
        (listener: () => void) =>
            workspaceId ? subscribeCliRuntimeSummaries(workspaceId, listener) : () => {},
        [workspaceId],
    );
    const getSnapshot = useCallback(
        () => cliRuntimeSummariesSnapshot(workspaceId ?? ''),
        [workspaceId],
    );

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

import { useCallback, useEffect, useSyncExternalStore } from 'react';

import type { RuntimeSummary } from '@/client';
import {
    cliRuntimeSummariesSnapshot,
    loadCliRuntimeSummariesInBackground,
    subscribeCliRuntimeSummaries,
} from '@/services/providers/cli-runtime-snapshot';

export const useCliRuntimeSummaries = (
    workspaceId: string | null | undefined,
): readonly RuntimeSummary[] => {
    useEffect(() => {
        if (workspaceId) {
            loadCliRuntimeSummariesInBackground(workspaceId);
        }
    }, [workspaceId]);

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

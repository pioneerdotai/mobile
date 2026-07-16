import { pioneerClient } from '@/client';
import type { RuntimeSummary } from '@/client';

const inFlightRefreshes = new Map<string, Promise<RuntimeSummary[]>>();

/**
 * Loads provider capabilities from the Gateway's live probe surface.
 *
 * `cli_runtime/list` is intentionally catalog-only and reports enabled runtimes
 * as unprobed. Composer and model-selection decisions must therefore use
 * `cli_runtime/refresh`, which returns the readiness-backed capability policy.
 * Concurrent consumers for the same workspace share one probe request.
 */
export const refreshCliRuntimeSummaries = (workspaceId: string): Promise<RuntimeSummary[]> => {
    const normalizedWorkspaceId = workspaceId.trim();
    if (!normalizedWorkspaceId) {
        return Promise.reject(new Error('workspace id is required to refresh CLI runtimes'));
    }

    const existing = inFlightRefreshes.get(normalizedWorkspaceId);
    if (existing) {
        return existing;
    }

    const refresh = pioneerClient
        .cliRuntimeRefresh({ workspace_id: normalizedWorkspaceId })
        .then((response) => response.runtimes)
        .finally(() => {
            if (inFlightRefreshes.get(normalizedWorkspaceId) === refresh) {
                inFlightRefreshes.delete(normalizedWorkspaceId);
            }
        });

    inFlightRefreshes.set(normalizedWorkspaceId, refresh);
    return refresh;
};

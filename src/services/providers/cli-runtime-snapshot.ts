import { pioneerClient } from '@/client';
import type { RuntimeSummary } from '@/client';

const inFlightLoads = new Map<string, Promise<RuntimeSummary[]>>();
const backgroundLoads = new Map<string, Promise<void>>();
type CliRuntimeSnapshot = {
    revision: number;
    runtimes: RuntimeSummary[];
};

const snapshots = new Map<string, CliRuntimeSnapshot>();
const minimumRevisions = new Map<string, number>();
const listeners = new Map<string, Set<() => void>>();
const generations = new Map<string, number>();
const EMPTY_RUNTIMES: RuntimeSummary[] = [];
const BACKGROUND_RETRY_DELAYS_MS = [0, 500, 2_000, 5_000] as const;

const normalizedWorkspaceId = (workspaceId: string): string => workspaceId.trim();

const notify = (workspaceId: string): void => {
    for (const listener of listeners.get(workspaceId) ?? []) {
        listener();
    }
};

export const cliRuntimeSummariesSnapshot = (workspaceId: string): RuntimeSummary[] =>
    snapshots.get(normalizedWorkspaceId(workspaceId))?.runtimes ?? EMPTY_RUNTIMES;

export const subscribeCliRuntimeSummaries = (
    workspaceId: string,
    listener: () => void,
): (() => void) => {
    const normalized = normalizedWorkspaceId(workspaceId);
    if (!normalized) {
        return () => {};
    }

    const workspaceListeners = listeners.get(normalized) ?? new Set<() => void>();
    workspaceListeners.add(listener);
    listeners.set(normalized, workspaceListeners);
    return () => {
        workspaceListeners.delete(listener);
        if (workspaceListeners.size === 0) {
            listeners.delete(normalized);
        }
    };
};

/** Reads the authoritative readiness snapshot without triggering a provider probe. */
export const loadCliRuntimeSummaries = (workspaceId: string): Promise<RuntimeSummary[]> => {
    const normalized = normalizedWorkspaceId(workspaceId);
    if (!normalized) {
        return Promise.reject(new Error('workspace id is required to load CLI runtimes'));
    }

    const existing = inFlightLoads.get(normalized);
    if (existing) {
        return existing;
    }

    const generation = generations.get(normalized) ?? 0;
    const load = pioneerClient
        .cliRuntimeList({ workspace_id: normalized })
        .then((response) => {
            if ((generations.get(normalized) ?? 0) !== generation) {
                return cliRuntimeSummariesSnapshot(normalized);
            }

            const current = snapshots.get(normalized);
            const revision = response.revision ?? 0;
            const minimumRevision = minimumRevisions.get(normalized) ?? 0;
            if (revision < minimumRevision || (current && revision < current.revision)) {
                // The response was created before a delta we have already
                // observed. Retry after this in-flight request unwinds; never
                // let an old full response lower the cache's revision floor.
                setTimeout(() => loadCliRuntimeSummariesInBackground(normalized), 0);
                return current?.runtimes ?? EMPTY_RUNTIMES;
            }

            snapshots.set(normalized, { revision, runtimes: response.runtimes });
            minimumRevisions.set(normalized, Math.max(minimumRevision, revision));
            notify(normalized);
            return response.runtimes;
        })
        .finally(() => {
            if (inFlightLoads.get(normalized) === load) {
                inFlightLoads.delete(normalized);
            }
        });

    inFlightLoads.set(normalized, load);
    return load;
};

export const loadCliRuntimeSummariesInBackground = (workspaceId: string): void => {
    const normalized = normalizedWorkspaceId(workspaceId);
    if (!normalized || backgroundLoads.has(normalized)) {
        return;
    }

    const generation = generations.get(normalized) ?? 0;
    const backgroundLoad = (async () => {
        for (const delayMs of BACKGROUND_RETRY_DELAYS_MS) {
            if ((generations.get(normalized) ?? 0) !== generation) {
                return;
            }
            if (delayMs > 0) {
                await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
            }
            if ((generations.get(normalized) ?? 0) !== generation) {
                return;
            }
            try {
                await loadCliRuntimeSummaries(normalized);
                return;
            } catch {
                // Snapshot reads are cheap and never trigger provider probes.
                // Retry a bounded number of times so a transient reconnect does
                // not leave the picker empty until the next app launch.
            }
        }
    })().finally(() => {
        if (backgroundLoads.get(normalized) === backgroundLoad) {
            backgroundLoads.delete(normalized);
        }
    });

    backgroundLoads.set(normalized, backgroundLoad);
};

export const applyCliRuntimeSummaryUpdate = (
    workspaceId: string,
    revision: number,
    runtime: RuntimeSummary,
    removed: boolean,
): void => {
    const normalized = normalizedWorkspaceId(workspaceId);
    if (!normalized) {
        return;
    }
    const current = snapshots.get(normalized);
    minimumRevisions.set(normalized, Math.max(minimumRevisions.get(normalized) ?? 0, revision));
    if (!current || revision === 0) {
        // A delta is meaningful only on top of a complete contiguous
        // workspace snapshot. Revision zero is the legacy protocol shape;
        // reload the authoritative list instead of manufacturing a partial
        // cache.
        loadCliRuntimeSummariesInBackground(normalized);
        return;
    }
    if (revision <= current.revision) {
        return;
    }
    if (revision > current.revision + 1) {
        // At least one provider update was dropped by the transport/client
        // queue. Only a complete list response can safely close the gap.
        loadCliRuntimeSummariesInBackground(normalized);
        return;
    }
    const next = [...current.runtimes];
    if (removed) {
        const index = next.findIndex((candidate) => candidate.runtime_id === runtime.runtime_id);
        if (index >= 0) {
            next.splice(index, 1);
        }
    } else {
        const index = next.findIndex((candidate) => candidate.runtime_id === runtime.runtime_id);
        if (index >= 0) {
            next[index] = runtime;
        } else {
            next.push(runtime);
        }
    }
    snapshots.set(normalized, { revision, runtimes: next });
    notify(normalized);
};

export const clearCliRuntimeSummaries = (workspaceId?: string): void => {
    if (workspaceId) {
        const normalized = normalizedWorkspaceId(workspaceId);
        generations.set(normalized, (generations.get(normalized) ?? 0) + 1);
        snapshots.delete(normalized);
        minimumRevisions.delete(normalized);
        inFlightLoads.delete(normalized);
        backgroundLoads.delete(normalized);
        notify(normalized);
        return;
    }

    const workspaceIds = new Set([
        ...snapshots.keys(),
        ...inFlightLoads.keys(),
        ...backgroundLoads.keys(),
        ...minimumRevisions.keys(),
    ]);
    workspaceIds.forEach((workspace) => {
        generations.set(workspace, (generations.get(workspace) ?? 0) + 1);
    });
    snapshots.clear();
    minimumRevisions.clear();
    inFlightLoads.clear();
    backgroundLoads.clear();
    workspaceIds.forEach(notify);
};

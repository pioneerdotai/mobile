import type { RuntimeSummary } from '@/client';
import { mobileClientBinding } from '@/client/mobile-client-binding';
import type { ProviderRuntimePublication } from '@/client/generated/provider_runtime_publication';

const EMPTY_RUNTIMES: RuntimeSummary[] = Object.freeze([]) as unknown as RuntimeSummary[];
const scopeFor = (workspaceId: string) => ({
    kind: 'provider_runtime' as const,
    workspace_id: workspaceId.trim(),
});

export const cliRuntimeSummariesSnapshot = (workspaceId: string): RuntimeSummary[] => {
    if (!workspaceId.trim()) return EMPTY_RUNTIMES;
    const publication = mobileClientBinding.scope(scopeFor(workspaceId)).getSnapshot()
        ?.payload as ProviderRuntimePublication | null;
    return publication?.runtimes ?? EMPTY_RUNTIMES;
};

const dispatch = (workspaceId: string, kind: 'observe' | 'release' | 'refresh'): void => {
    const scope = scopeFor(workspaceId);
    if (!scope.workspace_id) return;
    mobileClientBinding.dispatch({
        schema_version: 1,
        intent: {
            kind: 'provider_runtime',
            intent: { kind, workspace_id: scope.workspace_id },
        },
    });
    mobileClientBinding.drain(scope);
};

export const subscribeCliRuntimeSummaries = (
    workspaceId: string,
    listener: () => void,
): (() => void) => {
    if (!workspaceId.trim()) return () => {};
    const unsubscribe = mobileClientBinding.scope(scopeFor(workspaceId)).subscribe(listener);
    try {
        dispatch(workspaceId, 'observe');
    } catch (error) {
        unsubscribe();
        try {
            dispatch(workspaceId, 'release');
        } catch {
            /* Preserve the original bridge failure. */
        }
        throw error;
    }
    let active = true;
    return () => {
        if (!active) return;
        active = false;
        unsubscribe();
        dispatch(workspaceId, 'release');
    };
};

/** Client owns the bounded prefetch operation and cancels it with the session. */
export const loadCliRuntimeSummariesInBackground = (workspaceId: string): void => {
    dispatch(workspaceId, 'refresh');
};

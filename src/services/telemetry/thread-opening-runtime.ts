import { useSyncExternalStore } from 'react';
import { mobileClientBinding } from '@/client/mobile-client-binding';
import type { ComposerPublication } from '@/client/generated/composer_publication';
import type { ProviderRuntimePublication } from '@/client/generated/provider_runtime_publication';

export type ThreadOpeningRuntimeState =
    'pending' | 'ready' | 'setup_required' | 'degraded' | 'cancelled';
const emptyStore = { subscribe: (_listener: () => void) => () => {}, getSnapshot: () => null };

// provider_runtime subscriptions only lease publications: MobileClientBinding
// does not dispatch scope demand for this scope. Client's composer owns demand.
export const useThreadOpeningRuntime = (
    workspaceId: string | null,
    enabled: boolean,
): ProviderRuntimePublication | null => {
    const store =
        enabled && workspaceId
            ? mobileClientBinding.scope({ kind: 'provider_runtime', workspace_id: workspaceId })
            : emptyStore;
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return (snapshot?.payload as ProviderRuntimePublication | null) ?? null;
};

export const threadOpeningRuntimeState = (
    composer: ComposerPublication | null,
    publication: ProviderRuntimePublication | null,
    workspaceId: string | null,
    messageMode: boolean,
): ThreadOpeningRuntimeState => {
    if (messageMode) return 'ready';
    if (!composer) return 'pending';
    const provider = composer.draft.domain.selected_provider?.trim();
    if (!provider?.startsWith('cli_runtime:'))
        return composer.selected_provider_ready ? 'ready' : 'pending';
    const selected = composer.runtime_selection;
    if (
        !selected ||
        selected.identity.thread_id !== composer.thread_id ||
        selected.identity.draft_id !== composer.draft_id ||
        selected.workspace_id !== workspaceId ||
        selected.selected_provider !== provider
    )
        return 'pending';
    // Owner retirement is cancellation, even if a previously accepted row is
    // still retained. Authorization invalidation also clears those rows.
    if (selected.request.state.kind === 'cancelled') return 'cancelled';
    if (!publication || publication.workspace_id !== workspaceId) return 'pending';
    if (publication.request.kind === 'cancelled') return 'cancelled';
    const runtimeId = provider.slice('cli_runtime:'.length).trim();
    const runtime = publication.runtimes.find((row) => row.runtime_id === runtimeId);
    if (runtime && !runtime.enabled) return 'setup_required';
    switch (runtime?.status.state) {
        case 'initializing':
            return 'pending';
        case 'ready':
            // A repeat discovery can load/fail while accepted rows and applied
            // composer inputs remain usable. Its request is not a new barrier.
            return selected.selected_provider_ready && composer.selected_provider_ready
                ? 'ready'
                : 'pending';
        case 'spawn_failed':
        case 'degraded':
        case 'error':
            return 'degraded';
        case 'disabled':
        case 'missing_binary':
        case 'needs_auth':
        case 'unsupported_version':
            return 'setup_required';
    }
    // Without usable prerequisites discovery is still mandatory. Do not infer
    // absence from its in-flight list, or success before composer applies it.
    if (selected.request.state.kind === 'failed' || publication.request.kind === 'failed')
        return 'degraded';
    if (selected.request.state.kind !== 'ready' || publication.request.kind !== 'ready')
        return 'pending';
    return runtime ? 'pending' : 'setup_required';
};

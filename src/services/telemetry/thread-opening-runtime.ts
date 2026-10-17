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
    if (selected.request.state.kind === 'cancelled') return 'cancelled';
    if (selected.request.state.kind === 'failed') return 'degraded';
    if (!publication || publication.workspace_id !== workspaceId) return 'pending';
    if (publication.request.kind === 'cancelled') return 'cancelled';
    if (publication.request.kind === 'failed') return 'degraded';
    if (publication.request.kind !== 'ready') return 'pending';
    const runtimeId = provider.slice('cli_runtime:'.length).trim();
    const runtime = publication.runtimes.find((row) => row.runtime_id === runtimeId);
    if (!runtime || !runtime.enabled) return 'setup_required';
    switch (runtime.status.state) {
        case 'initializing':
            return 'pending';
        case 'ready':
            // A Ready provider publication may precede the derived composer
            // publication. Both inputs must have been applied before success.
            return selected.request.state.kind === 'ready' &&
                selected.selected_provider_ready &&
                composer.selected_provider_ready
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
};

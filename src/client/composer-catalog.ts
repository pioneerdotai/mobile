import { useEffect, useState, useSyncExternalStore } from 'react';
import type {
    ComposerCatalogIntent,
    ComposerCatalogKind,
    ComposerPickerKind,
} from './generated/client_intent';
import type {
    ComposerCatalogPublication,
    ComposerOperationIdentity,
} from './generated/composer_catalog_publication';
import { mobileClientBinding } from './mobile-client-binding';

const scopeFor = (threadId: string | null) =>
    threadId
        ? ({ kind: 'composer_catalog', thread_id: threadId } as const)
        : ({ kind: 'navigation' } as const);
export const composerCatalogSnapshot = (threadId: string): ComposerCatalogPublication | null =>
    (mobileClientBinding.scope(scopeFor(threadId)).getSnapshot()
        ?.payload as ComposerCatalogPublication | null) ?? null;
export const dispatchComposerCatalog = (intent: ComposerCatalogIntent) => {
    const result = mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'composer_catalog', intent },
    });
    const threadId =
        intent.kind === 'observe' ||
        intent.kind === 'retry' ||
        intent.kind === 'open_picker' ||
        intent.kind === 'remove_skill_chip'
            ? intent.thread_id
            : intent.identity.thread_id;
    mobileClientBinding.drain(scopeFor(threadId));
    mobileClientBinding.drain({ kind: 'composer', thread_id: threadId });
    return result;
};
export const useComposerCatalogPublication = (threadId: string | null) => {
    const store = mobileClientBinding.scope(scopeFor(threadId));
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return threadId ? ((snapshot?.payload as ComposerCatalogPublication | null) ?? null) : null;
};
export const useComposerCatalog = (
    threadId: string | null,
    draftId: number | null,
    catalog: ComposerCatalogKind,
    enabled: boolean,
) => {
    const input = useComposerCatalogPublication(enabled ? threadId : null);
    const kind = catalog.kind;
    const serverId = catalog.kind === 'mcp_tools' ? catalog.server_id : null;
    useEffect(() => {
        if (enabled && threadId && draftId !== null)
            dispatchComposerCatalog({
                kind: 'observe',
                thread_id: threadId,
                draft_id: draftId,
                catalog: kind === 'mcp_tools' ? { kind, server_id: serverId! } : { kind },
            });
    }, [threadId, draftId, kind, serverId, enabled]);
    return input?.draft_id === draftId ? input : null;
};
export const useComposerPicker = (
    threadId: string | null,
    draftId: number | null,
    picker: ComposerPickerKind,
    enabled: boolean,
) => {
    const input = useComposerCatalogPublication(enabled ? threadId : null);
    const [presentation] = useState(() => {
        let identity: ComposerOperationIdentity | null = null;
        const listeners = new Set<() => void>();
        return {
            getSnapshot: () => identity,
            subscribe: (listener: () => void) => {
                listeners.add(listener);
                return () => {
                    listeners.delete(listener);
                };
            },
            setIdentity: (next: ComposerOperationIdentity | null) => {
                if (identity === next) return;
                identity = next;
                listeners.forEach((listener) => listener());
            },
        };
    });
    const identity = useSyncExternalStore(
        presentation.subscribe,
        presentation.getSnapshot,
        presentation.getSnapshot,
    );
    useEffect(() => {
        if (!enabled || !threadId || draftId === null) return;
        const result = dispatchComposerCatalog({
            kind: 'open_picker',
            thread_id: threadId,
            draft_id: draftId,
            picker,
            deferred: false,
        });
        const owned =
            result.outcome === 'changed'
                ? (composerCatalogSnapshot(threadId)?.session?.identity ?? null)
                : null;
        presentation.setIdentity(owned);
        return () => {
            if (owned) dispatchComposerCatalog({ kind: 'close_picker', identity: owned });
            presentation.setIdentity(null);
        };
    }, [enabled, threadId, draftId, picker, presentation]);
    const session = input?.session;
    return {
        input: input?.draft_id === draftId ? input : null,
        identity:
            identity &&
            session?.identity.thread_id === identity.thread_id &&
            session.identity.draft_id === identity.draft_id &&
            session.identity.generation === identity.generation
                ? identity
                : null,
    };
};

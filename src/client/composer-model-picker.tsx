import {
    createContext,
    useContext,
    useEffect,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from 'react';
import type { ComposerModelPickerIntent } from './generated/client_intent';
import type {
    ComposerModelPickerPublication,
    ComposerOperationIdentity,
} from './generated/composer_model_picker_publication';
import { mobileClientBinding } from './mobile-client-binding';
import { composerSnapshot } from './composer';
import { useActiveThreadStore } from '@/stores/active-thread';

const ModelPickerContext = createContext<ComposerModelPickerPublication | null>(null);
const scopeFor = (threadId: string) =>
    ({ kind: 'composer_model_picker', thread_id: threadId }) as const;
export const dispatchComposerModelPicker = (intent: ComposerModelPickerIntent) => {
    const result = mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'composer_model_picker', intent },
    });
    const threadId = intent.kind === 'open' ? intent.thread_id : intent.identity.thread_id;
    mobileClientBinding.drain(scopeFor(threadId));
    mobileClientBinding.drain({ kind: 'composer', thread_id: threadId });
    return result;
};
export const useComposerModelPicker = () => useContext(ModelPickerContext);

export const ComposerModelPickerProvider = ({ children }: { children: ReactNode }) => {
    const activeThreadId = useActiveThreadStore((state) => state.activeComposerThreadId);
    const [target] = useState(() => {
        const draft = composerSnapshot(activeThreadId);
        return draft ? { thread_id: draft.thread_id, draft_id: draft.draft_id } : null;
    });
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
            set(value: ComposerOperationIdentity | null) {
                identity = value;
                listeners.forEach((listener) => listener());
            },
        };
    });
    const identity = useSyncExternalStore(
        presentation.subscribe,
        presentation.getSnapshot,
        presentation.getSnapshot,
    );
    const store = mobileClientBinding.scope(
        target ? scopeFor(target.thread_id) : { kind: 'navigation' },
    );
    const publication = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const input = publication?.payload as ComposerModelPickerPublication | null;
    useEffect(() => {
        if (!target || target.thread_id !== activeThreadId) return;
        const result = dispatchComposerModelPicker({
            kind: 'open',
            thread_id: target.thread_id,
            draft_id: target.draft_id,
            deferred: false,
        });
        if (result.outcome !== 'changed') return;
        const plan = (store.getSnapshot()?.payload as ComposerModelPickerPublication | null)
            ?.identity;
        if (!plan) return;
        presentation.set(plan);
        return () => {
            dispatchComposerModelPicker({ kind: 'close', identity: plan });
            presentation.set(null);
        };
    }, [target, activeThreadId, store, presentation]);
    const current =
        identity &&
        identity.thread_id === activeThreadId &&
        input &&
        !input.closed &&
        input.identity.thread_id === identity.thread_id &&
        input.identity.draft_id === identity.draft_id &&
        input.identity.generation === identity.generation
            ? input
            : null;
    return <ModelPickerContext.Provider value={current}>{children}</ModelPickerContext.Provider>;
};

import { beginTurnStartup } from '@/services/telemetry/turn-startup';
import { useSyncExternalStore } from 'react';
import type {
    ComposerIntent,
    ComposerOperationKind,
    ComposerOperationCompletion,
} from './generated/client_intent';
import type {
    ComposerOperationIdentity,
    ComposerOperationPlan,
    ComposerPublication,
} from './generated/composer_publication';
import { mobileClientBinding } from './mobile-client-binding';
export type { ComposerOperationIdentity } from './generated/composer_publication';

const storeFor = (threadId: string | null) =>
    mobileClientBinding.scope(
        threadId ? { kind: 'composer', thread_id: threadId } : { kind: 'navigation' },
    );

export const composerSnapshot = (threadId: string | null): ComposerPublication | null =>
    threadId
        ? ((storeFor(threadId).getSnapshot()?.payload as ComposerPublication | null) ?? null)
        : null;

export const useComposerPublication = (threadId: string | null): ComposerPublication | null => {
    const store = storeFor(threadId);
    const publication = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return threadId ? ((publication?.payload as ComposerPublication | null) ?? null) : null;
};

export const dispatchComposer = (intent: ComposerIntent) => {
    const startupStarted = performance.now();
    const result = mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'composer', intent },
    });
    if (intent.kind !== 'clear_all') {
        const threadId =
            intent.kind === 'complete_operation' ||
            intent.kind === 'prepare_operation' ||
            intent.kind === 'upload_operation' ||
            intent.kind === 'voice_session_started' ||
            intent.kind === 'start_voice_capture' ||
            intent.kind === 'commit_voice_capture' ||
            intent.kind === 'voice_finalized' ||
            intent.kind === 'finalize_voice_capture'
                ? intent.identity.thread_id
                : intent.thread_id;
        mobileClientBinding.drain({ kind: 'composer', thread_id: threadId });
    }
    if (result.outcome === 'changed') {
        if (intent.kind === 'commit_voice_capture')
            beginTurnStartup(intent.identity, startupStarted);
        if (intent.kind === 'begin_operation' && intent.operation === 'send') {
            const identity = composerSnapshot(intent.thread_id)?.operation?.identity;
            if (identity) beginTurnStartup(identity, startupStarted);
        }
    }
    return result;
};

export const beginComposerOperation = (
    threadId: string | null,
    operation: ComposerOperationKind,
): ComposerOperationPlan | null => {
    const current = composerSnapshot(threadId);
    if (!current) return null;
    const result = dispatchComposer({
        kind: 'begin_operation',
        thread_id: current.thread_id,
        draft_id: current.draft_id,
        operation,
    });
    return result.outcome === 'changed'
        ? (composerSnapshot(threadId)?.operation?.plan ?? null)
        : null;
};

export const completeComposerOperation = (
    identity: ComposerOperationIdentity,
    completion: ComposerOperationCompletion,
): boolean =>
    dispatchComposer({ kind: 'complete_operation', identity, completion }).outcome === 'changed';

export const composerOperationPlan = (
    identity: ComposerOperationIdentity,
): ComposerOperationPlan | null => {
    const current = composerSnapshot(identity.thread_id);
    const operation = current?.operation;
    return current?.draft_id === identity.draft_id &&
        operation?.identity.generation === identity.generation
        ? (operation.plan ?? null)
        : null;
};

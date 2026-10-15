import { useEffect, useSyncExternalStore } from 'react';
import { mobileClientBinding } from './mobile-client-binding';
import { useThreadCapabilities } from './thread-capabilities';
import type { ArtifactPublication } from './generated/artifact_publication';

export const retryThreadArtifacts = (threadId: string) =>
    mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'artifact', intent: { kind: 'retry', thread_id: threadId } },
    });

export const useThreadArtifacts = (
    threadId: string | null,
    visible: boolean,
    workspaceId: string | null,
) => {
    const capabilities = useThreadCapabilities(threadId, visible, workspaceId);
    const store = mobileClientBinding.scope(
        threadId && visible ? { kind: 'artifact', thread_id: threadId } : { kind: 'navigation' },
    );
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const revision = capabilities?.revision;
    useEffect(() => {
        if (threadId && visible)
            mobileClientBinding.dispatch({
                schema_version: 1,
                intent: { kind: 'artifact', intent: { kind: 'observe', thread_id: threadId } },
            });
    }, [threadId, workspaceId, visible, revision]);
    const input = threadId && visible ? (snapshot?.payload as ArtifactPublication | null) : null;
    return capabilities?.request.kind === 'ready' && input?.thread_id === threadId ? input : null;
};

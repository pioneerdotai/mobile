import { threadSnapshot } from '@/hooks/use-active-thread-snapshot-query';
import { pioneerClient, mobileClientBinding } from '@/client';
import type {
    ClientActiveThreadClearResult,
    ClientActiveThreadOpenByIdRequest,
    ClientActiveThreadOpenRequest,
    ClientActiveThreadSendTextRequest,
    ClientActiveThreadSendTextResult,
    ClientActiveThreadSnapshot,
    ClientEnsureWorkspaceDraftRequest,
} from '@/client';

export const openActiveThread = async (
    request: ClientActiveThreadOpenRequest,
): Promise<ClientActiveThreadSnapshot> => {
    mobileClientBinding.scope({ kind: 'thread', thread_id: request.thread.id });
    await pioneerClient.activeThreadOpen(request);
    mobileClientBinding.drain({ kind: 'thread', thread_id: request.thread.id });
    await mobileClientBinding.synchronize();
    const snapshot = threadSnapshot(request.thread.id);
    if (!snapshot) throw new Error('thread_open_stale');
    return snapshot;
};

export const openActiveThreadById = async (
    request: ClientActiveThreadOpenByIdRequest,
): Promise<ClientActiveThreadSnapshot> => {
    mobileClientBinding.scope({ kind: 'thread', thread_id: request.thread_id });
    await pioneerClient.activeThreadOpenById(request);
    mobileClientBinding.drain({ kind: 'thread', thread_id: request.thread_id });
    await mobileClientBinding.synchronize();
    const snapshot = threadSnapshot(request.thread_id);
    if (!snapshot) throw new Error('thread_open_stale');
    return snapshot;
};

export const openOrCreateNewThread = async (
    request: ClientEnsureWorkspaceDraftRequest,
): Promise<ClientActiveThreadSnapshot> => {
    const id = await pioneerClient.activeThreadOpenOrCreateNew(request);
    mobileClientBinding.drain({ kind: 'thread', thread_id: id });
    await mobileClientBinding.synchronize();
    const snapshot = threadSnapshot(id);
    if (!snapshot) throw new Error('thread_open_stale');
    return snapshot;
};

export const sendActiveThreadText = async (
    request: ClientActiveThreadSendTextRequest,
): Promise<ClientActiveThreadSendTextResult> => {
    return pioneerClient.activeThreadSendText(request);
};

export const clearActiveThread = async (): Promise<ClientActiveThreadClearResult> => {
    return pioneerClient.activeThreadClear();
};

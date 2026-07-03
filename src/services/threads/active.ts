import { pioneerClient } from '@/client';
import type {
    ClientActiveThreadCancelTurnRequest,
    ClientActiveThreadCancelTurnResult,
    ClientActiveThreadClearResult,
    ClientActiveThreadEventRequest,
    ClientActiveThreadEventResult,
    ClientActiveThreadOpenByIdRequest,
    ClientActiveThreadOpenRequest,
    ClientActiveThreadSendTextRequest,
    ClientActiveThreadSendTextResult,
    ClientActiveThreadSnapshot,
    ClientActiveThreadSnapshotRequest,
    ClientActiveThreadUnsubscribeRequest,
    ClientActiveThreadUnsubscribeResult,
    ClientEnsureWorkspaceDraftRequest,
} from '@/client';

export const openActiveThread = async (
    request: ClientActiveThreadOpenRequest,
): Promise<ClientActiveThreadSnapshot> => {
    return pioneerClient.activeThreadOpen(request);
};

export const openActiveThreadById = async (
    request: ClientActiveThreadOpenByIdRequest,
): Promise<ClientActiveThreadSnapshot> => {
    return pioneerClient.activeThreadOpenById(request);
};

export const ensureWorkspaceDraftThread = async (
    request: ClientEnsureWorkspaceDraftRequest,
): Promise<ClientActiveThreadSnapshot> => {
    return pioneerClient.activeThreadEnsureWorkspaceDraft(request);
};

export const openOrCreateNewThread = async (
    request: ClientEnsureWorkspaceDraftRequest,
): Promise<ClientActiveThreadSnapshot> => {
    return pioneerClient.activeThreadOpenOrCreateNew(request);
};

export const activeThreadSnapshot = (
    request: ClientActiveThreadSnapshotRequest,
): ClientActiveThreadSnapshot => {
    return pioneerClient.activeThreadSnapshot(request);
};

export const applyActiveThreadEvent = async (
    request: ClientActiveThreadEventRequest,
): Promise<ClientActiveThreadEventResult> => {
    return pioneerClient.activeThreadApplyEvent(request);
};

export const sendActiveThreadText = async (
    request: ClientActiveThreadSendTextRequest,
): Promise<ClientActiveThreadSendTextResult> => {
    return pioneerClient.activeThreadSendText(request);
};

export const cancelActiveThreadTurn = async (
    request: ClientActiveThreadCancelTurnRequest,
): Promise<ClientActiveThreadCancelTurnResult> => {
    return pioneerClient.activeThreadCancelTurn(request);
};

export const unsubscribeOrCloseActiveThread = async (
    request: ClientActiveThreadUnsubscribeRequest,
): Promise<ClientActiveThreadUnsubscribeResult> => {
    return pioneerClient.activeThreadUnsubscribeOrClose(request);
};

export const clearActiveThread = async (): Promise<ClientActiveThreadClearResult> => {
    return pioneerClient.activeThreadClear();
};

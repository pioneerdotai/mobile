import { pioneerClient } from '@/client';
import type {
    ClientActiveThreadCancelTurnRequest,
    ClientActiveThreadCancelTurnResult,
    ClientActiveThreadClearResult,
    ClientActiveThreadEventRequest,
    ClientActiveThreadOpenRequest,
    ClientActiveThreadSendTextRequest,
    ClientActiveThreadSendTextResult,
    ClientActiveThreadSnapshot,
    ClientActiveThreadSnapshotRequest,
} from '@/client';

export const openActiveThread = async (
    request: ClientActiveThreadOpenRequest,
): Promise<ClientActiveThreadSnapshot> => {
    return pioneerClient.activeThreadOpen(request);
};

export const activeThreadSnapshot = (
    request: ClientActiveThreadSnapshotRequest,
): ClientActiveThreadSnapshot => {
    return pioneerClient.activeThreadSnapshot(request);
};

export const applyActiveThreadEvent = async (
    request: ClientActiveThreadEventRequest,
): Promise<ClientActiveThreadSnapshot> => {
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

export const clearActiveThread = async (): Promise<ClientActiveThreadClearResult> => {
    return pioneerClient.activeThreadClear();
};

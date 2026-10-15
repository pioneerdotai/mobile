import { useSyncExternalStore } from 'react';
import type { ApprovalActionPublication } from './generated/approval_action_publication';
import type { ApprovalActionIntent } from './generated/client_intent';
import { mobileClientBinding } from './mobile-client-binding';

export const dispatchApprovalAction = (intent: ApprovalActionIntent) => {
    const result = mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'approval_action', intent },
    });
    mobileClientBinding.drain({
        kind: 'approval_action',
        thread_id: intent.thread_id,
        request_id: intent.request_id,
    });
    return result;
};

export const useApprovalAction = (threadId: string, requestId: string) => {
    const store = mobileClientBinding.scope({
        kind: 'approval_action',
        thread_id: threadId,
        request_id: requestId,
    });
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return (snapshot?.payload as ApprovalActionPublication | null) ?? null;
};

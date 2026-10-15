import { useEffect, useSyncExternalStore } from 'react';
import type { TaskReviewIntent } from './generated/client_intent';
import type { TaskReviewPublication } from './generated/task_review_publication';
import { mobileClientBinding } from './mobile-client-binding';

export const dispatchTaskReview = (intent: TaskReviewIntent) => {
    const result = mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'task_review', intent },
    });
    mobileClientBinding.drain({
        kind: 'task_review',
        thread_id: intent.thread_id,
        candidate_id: intent.candidate_id,
    });
    return result;
};

export const useTaskReviewPublication = (
    threadId: string,
    candidateId: string,
    input: unknown,
    canReview: boolean,
    canCancel: boolean,
) => {
    const store = mobileClientBinding.scope({
        kind: 'task_review',
        thread_id: threadId,
        candidate_id: candidateId,
    });
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    useEffect(() => {
        dispatchTaskReview({ kind: 'observe', thread_id: threadId, candidate_id: candidateId });
    }, [threadId, candidateId, input, canReview, canCancel]);
    return (snapshot?.payload as TaskReviewPublication | null) ?? null;
};

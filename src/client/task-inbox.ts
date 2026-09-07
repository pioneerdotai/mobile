import { useSyncExternalStore } from 'react';
import { mobileClientBinding, CLIENT_BINDING_SCHEMA_VERSION } from './mobile-client-binding';
import type { TaskInboxPublication } from './generated/task_inbox_publication';
import type { TaskNotificationIntent } from './generated/task_notification_intent';

export const useTaskInbox = (workspaceId: string | null) => {
    const scope = workspaceId
        ? ({ kind: 'task_inbox', workspace_id: workspaceId } as const)
        : ({ kind: 'navigation' } as const);
    const store = mobileClientBinding.scope(scope);
    const publication = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return workspaceId ? (publication?.payload as Readonly<TaskInboxPublication> | null) : null;
};
export const dispatchTaskNotification = (intent: TaskNotificationIntent) => {
    const transition = mobileClientBinding.dispatch({
        schema_version: CLIENT_BINDING_SCHEMA_VERSION,
        intent: { kind: 'task_notification', intent },
    });
    mobileClientBinding.drain({ kind: 'task_inbox', workspace_id: intent.workspace_id });
    return transition;
};

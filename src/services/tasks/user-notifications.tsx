import { useEffect } from 'react';
import { useTaskInbox, dispatchTaskNotification } from '@/client/task-inbox';
import { useTaskNotificationNative, type TaskNotificationNativePort } from '@/client/task-notification-native';
import { useAuthorizationCapabilitySnapshot } from '@/hooks/use-administration-capabilities';
import { useInboxScope } from './inbox-scope';

// One global lifecycle owner. Presentation and opened navigation belong to inbox.
export const TaskUserNotificationController = ({ notificationPort }: { notificationPort?: TaskNotificationNativePort } = {}) => {
    useAuthorizationCapabilitySnapshot();
    const scope = useInboxScope();
    const inbox = useTaskInbox(scope.enabled ? scope.workspaceId : null);
    useTaskNotificationNative(scope.enabled ? inbox : null, notificationPort);
    useEffect(() => {
        if (scope.enabled && scope.workspaceId)
            dispatchTaskNotification({ kind: 'refresh', workspace_id: scope.workspaceId });
    }, [scope.key, scope.enabled, scope.workspaceId]);
    return null;
};

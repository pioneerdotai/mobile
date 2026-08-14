import { describe, expect, it } from '@jest/globals';

import { taskUserNotificationTargetsInbox } from './user-notification-targeting';

describe('task user notification inbox targeting', () => {
    const notification = {
        workspaceId: 'workspace-a',
        recipientPrincipalId: 'principal-a',
    };

    it('accepts only the exact current workspace and principal', () => {
        expect(taskUserNotificationTargetsInbox(notification, 'workspace-a', 'principal-a')).toBe(
            true,
        );
        expect(taskUserNotificationTargetsInbox(notification, 'workspace-b', 'principal-a')).toBe(
            false,
        );
        expect(taskUserNotificationTargetsInbox(notification, 'workspace-a', 'principal-b')).toBe(
            false,
        );
        expect(taskUserNotificationTargetsInbox(notification, null, 'principal-a')).toBe(false);
        expect(taskUserNotificationTargetsInbox(notification, 'workspace-a', null)).toBe(false);
    });
});

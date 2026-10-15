import { describe, expect, it } from '@jest/globals';
import type { TaskUserNotification } from '@/client';
import { taskUserNotificationAuthorLabel } from './task-notification-presentation';

const labels = {
    agent: 'Agent',
    system: 'System',
    unknown: 'Unknown historical actor',
};

const notification = (overrides: Partial<TaskUserNotification>): TaskUserNotification => ({
    createdAt: 1,
    deliveryId: 'delivery-1',
    notificationId: 'notification-1',
    runId: 'run-1',
    taskId: 'task-1',
    workspaceId: 'workspace-1',
    ...overrides,
});

describe('taskUserNotificationAuthorLabel', () => {
    it('renders the immutable display name, nickname, and role snapshot', () => {
        expect(
            taskUserNotificationAuthorLabel(
                notification({
                    author: {
                        agent_execution_id: 'execution-1',
                        agent_identity_id: 'identity-1',
                        display_name: 'Build Agent',
                        identity_source_kind: 'native_agent',
                        identity_source_revision: 3,
                        nickname: 'builder',
                        role_label: 'Reviewer',
                    },
                    deliveryActionReceiptId: 'receipt-1',
                }),
                labels,
            ),
        ).toBe('Build Agent · @builder · Reviewer');
    });

    it('uses the agent label when the immutable role is absent', () => {
        expect(
            taskUserNotificationAuthorLabel(
                notification({
                    author: {
                        agent_execution_id: 'execution-1',
                        agent_identity_id: 'identity-1',
                        display_name: 'Build Agent',
                        identity_source_kind: 'native_agent',
                        identity_source_revision: 3,
                        nickname: '',
                    },
                }),
                labels,
            ),
        ).toBe('Build Agent · Agent');
    });

    it('does not relabel a legacy agent delivery as system', () => {
        expect(
            taskUserNotificationAuthorLabel(
                notification({ deliveryActionReceiptId: 'receipt-1' }),
                labels,
            ),
        ).toBe('Unknown historical actor');
    });

    it('renders an authorless system delivery as system', () => {
        expect(taskUserNotificationAuthorLabel(notification({}), labels)).toBe('System');
    });
});

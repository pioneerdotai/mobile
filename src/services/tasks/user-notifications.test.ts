import { InboxInteraction, formatInboxTime } from './inbox-interaction';
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


describe('screen-local inbox intent lifetime', () => {
    const opened = { operation_id: 41, notification_id: 'run', task_id: 'task', task_revision: 7, thread_id: 'confirmed' };
    it('ignores retained confirmations and does not assume globally increasing IDs', () => {
        const interaction = new InboxInteraction();
        expect(interaction.confirm(opened)).toBeNull();
        interaction.begin('run', 7, opened);
        expect(interaction.confirm(opened)).toBeNull();
        expect(interaction.confirm({ ...opened, operation_id: 1 })).toBe('confirmed');
        expect(interaction.confirm({ ...opened, operation_id: 1 })).toBeNull();
    });
    it('requires the exact run and revision and discards cancelled waits', () => {
        const interaction = new InboxInteraction();
        interaction.begin('run', 7);
        expect(interaction.confirm({ ...opened, task_revision: 6 })).toBeNull();
        expect(interaction.confirm({ ...opened, notification_id: 'other' })).toBeNull();
        interaction.cancel();
        expect(interaction.confirm(opened)).toBeNull();
    });
    it('formats completedAt seconds in local desktop date order', () => {
        const date = new Date(2026, 10, 4, 9, 5);
        expect(formatInboxTime(date.getTime() / 1000)).toBe('04.11.2026 09:05');
    });
});

describe('bounded inbox viewport demand', () => {
    it('continues short pages without gestures and caps an underfilled viewport at three pages', () => {
        const demand = new InboxInteraction();
        demand.range(1, 1);
        expect(demand.page('page-2', false, null, 1)).toBe(true);
        expect(demand.page('page-2', false, null, 1)).toBe(false);
        demand.range(2, 2);
        expect(demand.page('page-3', false, null, 2)).toBe(true);
        demand.range(3, 3);
        expect(demand.page('page-4', false, null, 3)).toBe(true);
        demand.range(4, 4);
        demand.reachedEnd(4);
        expect(demand.page('page-5', false, null, 4)).toBe(false);
        demand.reachedEnd(4);
        demand.range(4, 4);
        expect(demand.page('page-5', false, null, 4)).toBe(false);
        // Read/push removal shrinks the loaded range: fresh viewport demand may fill it again.
        demand.range(2, 2);
        expect(demand.page('page-5', false, null, 2)).toBe(true);
    });
    it('retries the failed cursor and resumes subsequent demand without a scroll gesture', () => {
        const demand = new InboxInteraction();
        demand.reachedEnd(1);
        expect(demand.page('page-2', true, null, 1)).toBe(false);
        expect(demand.page('page-2', false, null, 1)).toBe(true);
        expect(demand.page('page-2', false, 'failed', 1)).toBe(false);
        // A push clearing error must not silently repeat the failed page.
        expect(demand.page('page-2', false, null, 1)).toBe(false);
        demand.retry();
        expect(demand.page('page-2', true, null, 1)).toBe(false);
        expect(demand.page('page-2', false, null, 1)).toBe(true);
        demand.range(2, 2);
        expect(demand.page('page-3', false, null, 2)).toBe(true);
    });
    it('waits for the real list range and stops when a long page moves the end away', () => {
        const demand = new InboxInteraction();
        expect(demand.page('page-2', false, null, 1)).toBe(false);
        demand.range(1, 1);
        expect(demand.page('page-2', false, null, 1)).toBe(true);
        demand.range(3, 20);
        expect(demand.page('page-3', false, null, 20)).toBe(false);
        demand.range(18, 20);
        expect(demand.page('page-3', false, null, 20)).toBe(true);
    });
});

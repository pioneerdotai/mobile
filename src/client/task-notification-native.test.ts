import { expect, it, jest } from '@jest/globals';
jest.mock('./task-inbox', () => ({ dispatchTaskNotification: jest.fn() }));
import {
    TaskNotificationNativeBinding,
    type TaskNotificationNativePort,
} from './task-notification-native';
import type { TaskNotificationEffect } from './generated/task_notification_effect';

it('retains one OS resource per task revision and fences duplicate, replaced and closed callbacks', () => {
    const callbacks: ((result: 'activated' | 'dismissed') => void)[] = [];
    const port: TaskNotificationNativePort = {
        present: jest.fn<TaskNotificationNativePort['present']>((_effect, complete) => {
            callbacks.push(complete);
        }),
        remove: jest.fn(),
    };
    const dispatch = jest.fn();
    const binding = new TaskNotificationNativeBinding(port, dispatch);
    const effect: TaskNotificationEffect = {
        workspace_id: 'a',
        notification_id: 'n',
        task_id: 't',
        revision: 1,
    };
    binding.sync([effect]);
    binding.sync([effect]);
    expect(port.present).toHaveBeenCalledTimes(1);
    binding.sync([{ ...effect, revision: 2 }]);
    callbacks[0]('activated');
    expect(dispatch).not.toHaveBeenCalled();
    callbacks[1]('dismissed');
    callbacks[1]('activated');
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
        kind: 'native_completion',
        workspace_id: 'a',
        effect: { ...effect, revision: 2 },
        completion: 'dismissed',
    });
    binding.sync([{ ...effect, workspace_id: 'b', revision: 3 }]);
    binding.close();
    callbacks[2]('activated');
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(port.remove).toHaveBeenCalledTimes(3);
});

it('removes terminal resources using the Client actionable output', () => {
    const port: TaskNotificationNativePort = { present: jest.fn(), remove: jest.fn() };
    const binding = new TaskNotificationNativeBinding(port, jest.fn());
    binding.sync([{ workspace_id: 'a', notification_id: 'n', task_id: 't', revision: 1 }]);
    binding.sync([]);
    binding.close();
    expect(port.remove).toHaveBeenCalledTimes(1);
});

it('replaces a different inbox delivery of the same task and revision', () => {
    const callbacks: ((result: 'activated' | 'dismissed') => void)[] = [];
    const port: TaskNotificationNativePort = {
        present: jest.fn<TaskNotificationNativePort['present']>((_effect, complete) => {
            callbacks.push(complete);
        }),
        remove: jest.fn(),
    };
    const dispatch = jest.fn();
    const binding = new TaskNotificationNativeBinding(port, dispatch);
    const effect: TaskNotificationEffect = {
        workspace_id: 'a',
        task_id: 't',
        notification_id: 'n1',
        revision: 1,
    };
    binding.sync([effect]);
    binding.sync([{ ...effect, notification_id: 'n2' }]);
    callbacks[0]('activated');
    expect(dispatch).not.toHaveBeenCalled();
    expect(port.present).toHaveBeenCalledTimes(2);
    expect(port.remove).toHaveBeenCalledWith(effect);
    binding.close();
});

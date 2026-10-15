import { useEffect, useRef } from 'react';
import type { TaskInboxPublication } from './generated/task_inbox_publication';
import type { TaskNotificationEffect } from './generated/task_notification_effect';
import type { TaskNotificationIntent } from './generated/task_notification_intent';
import { dispatchTaskNotification } from './task-inbox';

type Completion = 'activated' | 'dismissed';
export interface TaskNotificationNativePort {
    present(effect: Readonly<TaskNotificationEffect>, complete: (result: Completion) => void): void;
    remove(effect: Readonly<TaskNotificationEffect>): void;
}

/** Retains only OS resources. Inbox identity, targeting and completion validity belong to Client. */
export class TaskNotificationNativeBinding {
    private readonly live = new Map<string, { effect: TaskNotificationEffect; active: boolean }>();
    constructor(
        private readonly port: TaskNotificationNativePort,
        private readonly dispatch: (
            intent: TaskNotificationIntent,
        ) => unknown = dispatchTaskNotification,
    ) {}

    sync(effects: readonly TaskNotificationEffect[]) {
        const retained = new Set<string>();
        for (const effect of effects) {
            if (retained.has(effect.task_id)) continue;
            retained.add(effect.task_id);
            const previous = this.live.get(effect.task_id);
            if (
                previous?.effect.workspace_id === effect.workspace_id &&
                previous.effect.revision === effect.revision &&
                previous.effect.notification_id === effect.notification_id
            )
                continue;
            if (previous) {
                previous.active = false;
                this.port.remove(previous.effect);
            }
            const delivery = { effect, active: true };
            this.live.set(effect.task_id, delivery);
            this.port.present(effect, (completion) => {
                if (!delivery.active) return;
                delivery.active = false;
                this.dispatch({
                    kind: 'native_completion',
                    workspace_id: effect.workspace_id,
                    effect,
                    completion,
                });
            });
        }
        for (const [key, delivery] of this.live) {
            if (retained.has(key)) continue;
            delivery.active = false;
            this.port.remove(delivery.effect);
            this.live.delete(key);
        }
    }
    close() {
        for (const delivery of this.live.values()) {
            delivery.active = false;
            this.port.remove(delivery.effect);
        }
        this.live.clear();
    }
}

/** The existing in-app notification surface does not request OS delivery. */
export const useTaskNotificationNative = (
    inbox: Readonly<TaskInboxPublication> | null | undefined,
    port?: TaskNotificationNativePort,
) => {
    const binding = useRef<TaskNotificationNativeBinding | null>(null);
    useEffect(() => {
        binding.current = port ? new TaskNotificationNativeBinding(port) : null;
        return () => {
            binding.current?.close();
            binding.current = null;
        };
    }, [port]);
    useEffect(() => {
        binding.current?.sync(inbox?.native_notifications ?? []);
    }, [inbox, port]);
};

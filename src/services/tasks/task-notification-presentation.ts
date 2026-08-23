import type { TaskUserNotification } from '@/client';

/**
 * Task delivery is the only notification path where a missing author can be a
 * legitimate system actor. A receipt proves an agent-authored delivery, so a
 * legacy record with a receipt but without its immutable snapshot must stay
 * explicitly unknown instead of being relabelled from mutable current state.
 */
export const taskUserNotificationAuthorLabel = (
    notification: TaskUserNotification,
    labels: { agent: string; system: string; unknown: string },
): string => {
    const author = notification.author;
    if (!author) {
        return notification.deliveryActionReceiptId ? labels.unknown : labels.system;
    }
    const role = author.role_label?.trim() || labels.agent;
    return author.nickname.trim()
        ? `${author.display_name} · @${author.nickname} · ${role}`
        : `${author.display_name} · ${role}`;
};

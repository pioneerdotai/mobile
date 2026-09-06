import type { TaskWaitReviewDisplayItem } from '@/client/generated/task_wait_review_display_item';

export const taskReviewUserControlsAllowed = (item: TaskWaitReviewDisplayItem): boolean =>
    item.user_approval_required && item.review_mode === 'user_approval';

export const canManageTaskReviewItem = ({
    item,
    canReviewTasks,
    canCancelTasks,
}: {
    item: TaskWaitReviewDisplayItem;
    canReviewTasks: boolean;
    canCancelTasks: boolean;
}): boolean => {
    const actions = new Set(item.allowed_actions);
    return (
        (canReviewTasks && (actions.has('task_accept') || actions.has('task_revise'))) ||
        (canCancelTasks && actions.has('task_cancel'))
    );
};

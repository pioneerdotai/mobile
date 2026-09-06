import { describe, expect, it } from '@jest/globals';

import { canManageTaskReviewItem, taskReviewUserControlsAllowed } from './review';

describe('task review presentation', () => {
    it('uses exact task actions for every collaborator instead of task ownership', () => {
        const item = {
            task_id: 'task-1',
            owner_principal_id: 'member-a',
            candidate_id: 'candidate-1',
            diagnostics: [],
            user_approval_required: true,
            allowed_actions: ['task_accept'],
            review_mode: 'user_approval',
        };
        expect(taskReviewUserControlsAllowed(item)).toBe(true);
        expect(
            canManageTaskReviewItem({
                item,
                canReviewTasks: true,
                canCancelTasks: false,
            }),
        ).toBe(true);
        expect(
            canManageTaskReviewItem({
                item,
                canReviewTasks: false,
                canCancelTasks: true,
            }),
        ).toBe(false);
        expect(
            canManageTaskReviewItem({
                item: { ...item, allowed_actions: ['task_cancel'] },
                canReviewTasks: false,
                canCancelTasks: true,
            }),
        ).toBe(true);
    });
});

import { describe, expect, it } from '@jest/globals';

import {
    canManageTaskReviewItem,
    taskReviewUserControlsAllowed,
    taskWaitReviewDisplay,
} from './review';

describe('task review presentation', () => {
    it('projects a sanitized task_wait review without exposing raw storage output', () => {
        const review = taskWaitReviewDisplay('task_wait', {
            kind: 'summary',
            metadata: {
                sanitizedResult: metadata({
                    mode: 'all_terminal_or_review_required',
                    reviewRequiredCount: 1,
                    reviewRequired: [
                        {
                            taskId: 'K00000000000000000001',
                            ownerPrincipalId: 'member-a',
                            runId: 'R00000000000000000001',
                            candidateId: 'candidate-1',
                            title: 'Verify release',
                            reviewMode: 'user_approval',
                            userApprovalRequired: true,
                            allowedActions: ['task_accept', 'task_revise', 'task_cancel'],
                            remainingRevisionRounds: 2,
                            summary: 'Checks passed',
                        },
                    ],
                }),
            },
        });

        expect(review?.review_required_count).toBe(1);
        expect(review?.items[0]?.candidate_id).toBe('candidate-1');
        expect(review?.items[0]?.owner_principal_id).toBe('member-a');
        expect(review?.items[0]?.remaining_revision_rounds).toBe(2);
        expect(taskReviewUserControlsAllowed(review!.items[0]!)).toBe(true);
        expect(taskWaitReviewDisplay('other_tool', {})).toBeNull();
    });

    it('uses exact task actions for every collaborator instead of task ownership', () => {
        const item = {
            task_id: 'task-1',
            owner_principal_id: 'member-a',
            candidate_id: 'candidate-1',
            diagnostics: [],
            user_approval_required: true,
            allowed_actions: ['task_accept'],
        };
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

const metadata = (value: unknown): unknown => {
    if (value === null) return { kind: 'null' };
    if (typeof value === 'boolean') return { kind: 'bool', value };
    if (typeof value === 'number') return { kind: 'number', value: String(value) };
    if (typeof value === 'string') return { kind: 'string', value };
    if (Array.isArray(value)) return { kind: 'array', values: value.map(metadata) };
    return {
        kind: 'object',
        fields: Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
                key,
                metadata(entry),
            ]),
        ),
    };
};

import { describe, expect, it } from '@jest/globals';

import type { TimelineRow } from '@/services/threads/conversation/timeline';

import { viewportPrefetchPlan } from './viewport-prefetch';

describe('mobile timeline viewport prefetch', () => {
    it('does not request turn work pages from non-work semantic rows', () => {
        const rows = [userRow(), workGroupRow(), assistantRow()];
        const plan = viewportPrefetchPlan(rows, [1], 1, 1);

        expect(plan).not.toBeNull();
        expect(plan?.turnWork).toEqual({});
        expect(plan?.nearStart).toBe(true);
    });

    it('requests turn work pages only near loaded semantic work item boundaries', () => {
        const rows = [
            userRow(),
            workGroupRow(),
            ...Array.from({ length: 20 }, (_, index) => workItemRow(index)),
            assistantRow(),
        ];

        const nearStart = viewportPrefetchPlan(rows, [8], 8, 8);
        const middle = viewportPrefetchPlan(rows, [12], 12, 12);
        const nearEnd = viewportPrefetchPlan(rows, [20], 20, 20);

        expect(nearStart?.turnWork.turn_a).toMatchObject({
            nearStart: true,
            nearEnd: false,
        });
        expect(middle?.turnWork.turn_a).toMatchObject({
            nearStart: false,
            nearEnd: false,
        });
        expect(nearEnd?.turnWork.turn_a).toMatchObject({
            nearStart: false,
            nearEnd: true,
        });
    });

    it('changes the work boundary key when an older page is prepended', () => {
        const initialRows = [
            userRow(),
            workGroupRow(),
            ...Array.from({ length: 50 }, (_, index) => workItemRow(index + 50)),
            assistantRow(),
        ];
        const prependedRows = [
            userRow(),
            workGroupRow(),
            ...Array.from({ length: 100 }, (_, index) => workItemRow(index)),
            assistantRow(),
        ];

        const initial = viewportPrefetchPlan(initialRows, [2, 3, 4], 2, 4);
        const prepended = viewportPrefetchPlan(prependedRows, [2, 3, 4], 2, 4);

        expect(initial?.turnWork.turn_a.nearStart).toBe(true);
        expect(prepended?.turnWork.turn_a.nearStart).toBe(true);
        expect(prepended?.turnWork.turn_a.key).not.toBe(initial?.turnWork.turn_a.key);
    });
});

const userRow = (): TimelineRow => ({
    type: 'user-message',
    key: 'user_a',
    itemId: 'user_a',
    turnId: 'turn_a',
    text: 'hello',
    attachments: [],
    timestampLabel: '',
});

const assistantRow = (): TimelineRow => ({
    type: 'assistant-message',
    key: 'assistant_a',
    itemId: 'assistant_a',
    turnId: 'turn_a',
    text: 'done',
    markdown: null,
    phase: 'final_answer',
    streaming: false,
    taskTimeline: false,
    elapsedLabel: null,
    timestampLabel: '',
});

const workGroupRow = (): TimelineRow => ({
    type: 'work-group',
    key: 'semantic-turn-work-group::turn_a',
    turnId: 'turn_a',
    anchorItemId: 'work_a',
    anchorEntryId: 'work_a',
    title: 'Работал',
    elapsedMs: 1_000,
    elapsedLabel: '1 сек',
    expanded: true,
});

const workItemRow = (index: number): TimelineRow => ({
    type: 'command-execution',
    key: `work_${index}`,
    itemId: `item_${index}`,
    turnId: 'turn_a',
    status: 'Completed',
    command: 'echo ok',
    cwd: null,
    durationMs: 10,
    exitCode: 0,
    outputPreview: 'ok',
    terminalText: 'ok',
    timedOut: false,
    truncated: false,
    streaming: false,
    elapsedLabel: null,
    semanticWorkItem: true,
});

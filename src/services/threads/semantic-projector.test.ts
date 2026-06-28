import { describe, expect, it, jest } from '@jest/globals';

import type { TimelineBlock, TurnWorkBlock, TurnWorkItem } from '@/client';
import type {
    ClientActiveThreadSnapshot,
    MarkdownDocument,
} from '@/client/generated/client_active_thread_snapshot';

import { projectSemanticTimelineToRows } from './semantic-projector';

jest.mock('@/locale/i18n', () => ({
    __esModule: true,
    default: {
        t: (key: string, options?: Record<string, unknown>) =>
            options?.count !== undefined ? `${key}:${options.count}` : key,
    },
}));

const snapshot = (): ClientActiveThreadSnapshot =>
    ({
        history_loaded: true,
        history_loading: false,
        projection: {
            composer_locked: false,
            in_flight_turn_id: null,
            items: [],
            last_error: null,
            pending_request_id: null,
            phase_label: null,
            revision: 0,
            timeline: [],
            turns: [],
        },
        rows: [],
    }) as unknown as ClientActiveThreadSnapshot;

const markdown: MarkdownDocument = {
    blocks: [
        {
            type: 'paragraph',
            content: {
                text: 'final markdown',
                marks: [],
            },
        },
    ],
};

describe('mobile semantic timeline projector', () => {
    it('keeps final work collapsed immediately and preserves assistant markdown', () => {
        const rows = projectSemanticTimelineToRows({
            snapshot: snapshot(),
            blocks: [
                userBlock('001'),
                workBlock('002', {
                    presentation: 'collapsed_after_final',
                    state: 'completed',
                    workCount: 70_000,
                    visibleWorkCount: 70_000,
                    hiddenWorkCount: 0,
                    hasMoreAfter: true,
                }),
                assistantBlock('003'),
            ],
            expandedKeys: [],
            workRangesByTurn: {},
            nowMs: 10_000,
        });

        expect(rows.map((row) => row.type)).toEqual([
            'user-message',
            'work-group',
            'assistant-message',
        ]);
        expect(rows.find((row) => row.type === 'work-group')).toMatchObject({
            key: 'semantic-turn-work-group::turn_a',
            turnId: 'turn_a',
            expanded: false,
        });
        expect(rows.find((row) => row.type === 'assistant-message')).toMatchObject({
            text: 'final **markdown**',
            markdown,
        });
    });

    it('expands large work from the bounded work range only', () => {
        const rows = projectSemanticTimelineToRows({
            snapshot: snapshot(),
            blocks: [
                userBlock('001'),
                workBlock('002', {
                    presentation: 'collapsed_after_final',
                    state: 'completed',
                    workCount: 70_000,
                    visibleWorkCount: 69_300,
                    hiddenWorkCount: 700,
                    hasMoreAfter: true,
                }),
                assistantBlock('003'),
            ],
            expandedKeys: ['semantic-turn-work-group::turn_a'],
            workRangesByTurn: {
                turn_a: {
                    work: workSummary({
                        presentation: 'collapsed_after_final',
                        state: 'completed',
                        workCount: 70_000,
                        visibleWorkCount: 69_300,
                        hiddenWorkCount: 700,
                        hasMoreAfter: true,
                    }),
                    items: [commandWorkItem('work_001', '001'), commandWorkItem('work_002', '002')],
                    hasLoadedPage: true,
                },
            },
            nowMs: 10_000,
        });

        expect(rows.filter((row) => row.type === 'command-execution')).toHaveLength(2);
        expect(
            rows
                .filter((row) => row.type === 'command-execution')
                .every((row) => row.semanticWorkItem),
        ).toBe(true);
        expect(rows.some((row) => row.type === 'system-event')).toBe(false);
        expect(rows.find((row) => row.type === 'work-group')).toMatchObject({
            turnId: 'turn_a',
            expanded: true,
        });
        expect(rows.find((row) => row.type === 'assistant-message')?.semanticWorkItem).toBe(
            undefined,
        );
    });

    it('renders running row for live no-final work without a collapsed toggle', () => {
        const rows = projectSemanticTimelineToRows({
            snapshot: snapshot(),
            blocks: [
                userBlock('001'),
                workBlock('002', {
                    presentation: 'expanded_live',
                    state: 'running',
                    workCount: 70_000,
                    visibleWorkCount: 69_300,
                    hiddenWorkCount: 700,
                    startedAtUnixMs: 1_000,
                    hasMoreAfter: true,
                }),
            ],
            expandedKeys: [],
            workRangesByTurn: {},
            nowMs: 10_000,
        });

        expect(rows.some((row) => row.type === 'work-group')).toBe(false);
        expect(rows.find((row) => row.type === 'running')).toMatchObject({
            turnId: 'turn_a',
            startedAtUnixMs: 1_000,
        });
    });

    it('projects pending request blocks into actionable CLI runtime request rows', () => {
        const rows = projectSemanticTimelineToRows({
            snapshot: snapshot(),
            blocks: [
                userBlock('001'),
                workBlock('002', {
                    presentation: 'expanded_live',
                    state: 'blocked',
                    workCount: 1,
                    visibleWorkCount: 1,
                }),
                pendingRequestBlock('003'),
            ],
            expandedKeys: [],
            workRangesByTurn: {},
            nowMs: 10_000,
        });

        const requestRow = rows.find((row) => row.type === 'cli-runtime-request');

        expect(requestRow).toMatchObject({
            key: 'timeline-cli-runtime-request::request_a',
            turnId: 'turn_a',
            entry: {
                workspace_id: 'workspace_a',
                runtime_id: 'codex',
                request_id: 'request_a',
                thread_id: 'thread_a',
                turn_id: 'turn_a',
                item_id: 'native_item_a',
                request: {
                    kind: 'command_approval',
                    title: 'Run command',
                    message: 'Approve command',
                    native_request_id: 'native_request_a',
                    payload: {
                        command: 'echo ok',
                        cwd: '/tmp/project',
                    },
                },
            },
        });
    });
});

const userBlock = (sortKey: string): TimelineBlock => ({
    workspaceId: 'workspace_a',
    threadId: 'thread_a',
    blockId: `block_user_${sortKey}`,
    turnId: 'turn_a',
    sortKey,
    startedAtUnixMs: 1,
    updatedAtUnixMs: 1,
    kind: {
        kind: 'user_message',
        itemId: `user_${sortKey}`,
        text: 'hello',
        attachments: [],
        inputs: [],
    },
});

const assistantBlock = (sortKey: string): TimelineBlock => ({
    workspaceId: 'workspace_a',
    threadId: 'thread_a',
    blockId: `block_assistant_${sortKey}`,
    turnId: 'turn_a',
    sortKey,
    startedAtUnixMs: 3,
    updatedAtUnixMs: 3,
    kind: {
        kind: 'assistant_message',
        itemId: `assistant_${sortKey}`,
        text: 'final **markdown**',
        markdown,
    },
});

const pendingRequestBlock = (sortKey: string): TimelineBlock => ({
    workspaceId: 'workspace_a',
    threadId: 'thread_a',
    blockId: `block_pending_${sortKey}`,
    turnId: 'turn_a',
    sortKey,
    startedAtUnixMs: 4,
    updatedAtUnixMs: 4,
    kind: {
        kind: 'pending_request',
        runtimeId: 'codex',
        requestId: 'request_a',
        status: 'pending',
        itemId: 'native_item_a',
        request: {
            kind: 'command_approval',
            title: 'Run command',
            message: 'Approve command',
            native_request_id: 'native_request_a',
            payload: {
                command: 'echo ok',
                cwd: '/tmp/project',
            },
        },
    },
});

const workBlock = (sortKey: string, overrides: Partial<TurnWorkBlock>): TimelineBlock => ({
    workspaceId: 'workspace_a',
    threadId: 'thread_a',
    blockId: `block_work_${sortKey}`,
    turnId: 'turn_a',
    sortKey,
    startedAtUnixMs: overrides.startedAtUnixMs ?? 2,
    updatedAtUnixMs: 2,
    kind: {
        kind: 'turn_work',
        work: workSummary(overrides),
    },
});

const workSummary = (overrides: Partial<TurnWorkBlock>): TurnWorkBlock => ({
    turnId: 'turn_a',
    presentation: overrides.presentation ?? 'collapsed_after_final',
    state: overrides.state ?? 'completed',
    startedAtUnixMs: overrides.startedAtUnixMs ?? 2,
    completedAtUnixMs: overrides.completedAtUnixMs ?? 3,
    elapsedMs: overrides.elapsedMs ?? 1_000,
    workCount: overrides.workCount ?? 1,
    visibleWorkCount: overrides.visibleWorkCount ?? 1,
    hiddenWorkCount: overrides.hiddenWorkCount ?? 0,
    hasMoreBefore: overrides.hasMoreBefore ?? false,
    hasMoreAfter: overrides.hasMoreAfter ?? false,
    beforeCursor: overrides.beforeCursor ?? null,
    afterCursor: overrides.afterCursor ?? null,
    firstWorkItemId: overrides.firstWorkItemId ?? null,
    lastWorkItemId: overrides.lastWorkItemId ?? null,
});

const commandWorkItem = (workItemId: string, orderKey: string): TurnWorkItem => ({
    workItemId,
    itemId: `item_${workItemId}`,
    turnId: 'turn_a',
    orderKey,
    itemType: 'command_execution',
    status: 'completed',
    startedAtUnixMs: 2,
    completedAtUnixMs: 3,
    metadata: null,
    item: {
        type: 'commandExecution',
        id: `item_${workItemId}`,
        toolName: 'exec_command',
        arguments: { command: ['echo', 'ok'] },
        status: 'completed',
        outputPolicy: {
            deltas: { mode: 'disabled' },
            llm: { mode: 'summary_only' },
            llmRetention: { mode: 'do_not_retain' },
            recovery: { mode: 'none' },
            storage: { mode: 'none' },
            timeline: { mode: 'summary', max_chars: 4_000 },
        },
        display: {
            kind: 'shell',
            stdout: 'ok',
            stderr: null,
            aggregated_output: 'ok',
            exit_code: 0,
            duration_ms: 10,
            timed_out: false,
            truncated: false,
        },
        storage: {
            kind: 'shell',
            stdout: 'ok',
            stderr: null,
            aggregated_output: 'ok',
            exit_code: 0,
            duration_ms: 10,
            timed_out: false,
            truncated: false,
        },
        command: ['echo', 'ok'],
        cwd: null,
        success: true,
        recovery: null,
        recoveryPolicy: null,
        outcome: null,
        observation: null,
    },
});

import { describe, expect, it, jest } from '@jest/globals';

import type { TimelineBlock } from '@/client/generated/timeline_block';
import type { TurnWorkBlock } from '@/client/generated/turn_work_block';
import type { TurnWorkItem } from '@/client/generated/turn_work_item';
import type { TurnWorkState } from '@/client/generated/turn_work_state';
import type {
    ClientActiveThreadSnapshot,
    MarkdownDocument,
} from '@/client/generated/client_active_thread_snapshot';

import { projectConversationToRows } from './conversation/projector';
import { projectSemanticTimelineToRows } from './semantic-projector';

jest.mock('@/locale/i18n', () => ({
    __esModule: true,
    default: {
        t: (key: string, options?: Record<string, unknown>) =>
            options?.count !== undefined ? `${key}:${options.count}` : key,
    },
}));

const snapshot = (
    projectionOverrides: Partial<ClientActiveThreadSnapshot['projection']> = {},
): ClientActiveThreadSnapshot =>
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
            ...projectionOverrides,
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

    it('keeps a detached task card top-level while later messages and delivery follow it', () => {
        const result = assistantBlock('003');
        result.turnId = 'task_turn_a';
        const rows = projectSemanticTimelineToRows({
            snapshot: snapshot(),
            blocks: [
                detachedTaskRunBlock('001', 'running'),
                {
                    ...userBlock('002'),
                    turnId: 'user_turn_b',
                },
                result,
            ],
            expandedKeys: [],
            workRangesByTurn: {},
            nowMs: 10_000,
        });

        expect(rows.map((row) => row.type)).toEqual([
            'task-anchor',
            'user-message',
            'assistant-message',
        ]);
        expect(rows[0]).toMatchObject({
            type: 'task-anchor',
            turnId: 'task_turn_a',
            taskId: 'task_a',
            status: 'running',
            startedAtUnixMs: 9_000,
            elapsedLabel: 'threads:timelineElapsedSeconds',
            progressPreview: 'Collecting sources',
        });
        expect(rows[0]?.semanticWorkItem).toBeUndefined();
        expect(rows.some((row) => row.type === 'work-group')).toBe(false);

        const completedRows = projectSemanticTimelineToRows({
            snapshot: snapshot(),
            blocks: [detachedTaskRunBlock('001', 'completed')],
            expandedKeys: [],
            workRangesByTurn: {},
            nowMs: 11_000,
        });
        expect(completedRows[0]).toMatchObject({
            type: 'task-anchor',
            key: rows[0]?.key,
            status: 'completed',
            elapsedLabel: null,
            resultPreview: 'Analysis complete',
        });
    });

    it('collapses terminal work without a final answer and renders the outcome banner', () => {
        const rows = projectSemanticTimelineToRows({
            snapshot: snapshot(),
            blocks: [
                userBlock('001'),
                workBlock('002', {
                    presentation: 'collapsed_after_final',
                    state: 'failed',
                    workCount: 50,
                    visibleWorkCount: 50,
                }),
                turnStateBlock('003', 'failed', 'provider disconnected'),
            ],
            expandedKeys: [],
            workRangesByTurn: {},
            nowMs: 10_000,
        });

        expect(rows.map((row) => row.type)).toEqual(['user-message', 'work-group', 'system-event']);
        expect(rows.find((row) => row.type === 'work-group')).toMatchObject({
            turnId: 'turn_a',
            expanded: false,
        });
        expect(rows.find((row) => row.type === 'system-event')).toMatchObject({
            turnId: 'turn_a',
            level: 'error',
            message: 'provider disconnected',
            code: 'turn_failed',
        });
    });

    it('renders fallback banners for every unsuccessful terminal state', () => {
        for (const [state, level, code, message] of [
            ['failed', 'error', 'turn_failed', 'Turn failed'],
            ['interrupted', 'warning', 'turn_cancelled', 'Turn cancelled'],
            ['blocked', 'warning', 'turn_blocked', 'Turn blocked'],
        ] as const) {
            const rows = projectSemanticTimelineToRows({
                snapshot: snapshot(),
                blocks: [turnStateBlock('003', state, null)],
                expandedKeys: [],
                workRangesByTurn: {},
                nowMs: 10_000,
            });

            expect(rows).toHaveLength(1);
            expect(rows[0]).toMatchObject({
                type: 'system-event',
                turnId: 'turn_a',
                level,
                code,
                message,
            });
        }
    });

    it('projects standalone, full-pack, and partial historical snapshots without live catalog data', () => {
        const block = userBlock('001');
        if (block.kind.kind !== 'user_message') {
            throw new Error('expected user-message fixture');
        }
        block.kind.attachments = [
            {
                type: 'skillPack',
                capability: {
                    packId: 'PPPPPPPPPPPPPPPPPPPPP',
                    label: 'Research Pack',
                },
            },
            {
                type: 'skill',
                capability: {
                    skillId: 'SSSSSSSSSSSSSSSSSSSSS',
                    owner: 'alex',
                    slug: 'search',
                    sourceKind: 'user',
                    label: 'alex/search',
                    pack: {
                        packId: 'PPPPPPPPPPPPPPPPPPPPP',
                        label: 'Research Pack',
                    },
                },
            },
            {
                type: 'skill',
                capability: {
                    skillId: 'HHHHHHHHHHHHHHHHHHHHH',
                    owner: 'alex',
                    slug: 'humanizer',
                    sourceKind: 'user',
                    label: 'alex/humanizer',
                },
            },
        ];

        const rows = projectSemanticTimelineToRows({
            snapshot: snapshot(),
            blocks: [block],
            expandedKeys: [],
            workRangesByTurn: {},
            nowMs: 10_000,
        });

        expect(rows.find((row) => row.type === 'user-message')).toMatchObject({
            attachments: [
                {
                    id: 'skill-pack:PPPPPPPPPPPPPPPPPPPPP',
                    label: 'Research Pack',
                    kind: 'skill',
                },
                {
                    id: 'skill:SSSSSSSSSSSSSSSSSSSSS',
                    label: 'Research Pack / alex/search',
                    kind: 'skill',
                },
                {
                    id: 'skill:HHHHHHHHHHHHHHHHHHHHH',
                    label: 'alex/humanizer',
                    kind: 'skill',
                },
            ],
        });
    });

    it('projects native work toggle turn id from the semantic group key', () => {
        const rows = projectConversationToRows({
            ...snapshot(),
            rows: [
                {
                    key: 'semantic-turn-work-group::turn_a',
                    kind: {
                        TurnWorkToggle: {
                            toggle_key: 'semantic-turn-work-group::turn_a',
                            anchor_entry_id: 'block_work',
                            elapsed_ms: 1_234,
                            is_open: false,
                        },
                    },
                },
            ],
        });

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            type: 'work-group',
            key: 'semantic-turn-work-group::turn_a',
            turnId: 'turn_a',
            expanded: false,
        });
    });

    it('keeps native work elapsed only while running', () => {
        const workItem = commandWorkItem('work_001', '001');
        const nativeSnapshot = snapshot({
            items: [
                {
                    id: workItem.itemId,
                    turn_id: workItem.turnId,
                    item_type: workItem.itemType,
                    status: 'Completed',
                    started_at_unix_ms: 1_000,
                    updated_at_unix_ms: 3_000,
                    completed_at_unix_ms: 3_000,
                    partial_text: '',
                    item: workItem.item,
                },
            ],
            timeline: [
                {
                    id: workItem.workItemId,
                    turn_id: workItem.turnId,
                    item_id: workItem.itemId,
                    item_index: 0,
                },
            ],
        });
        nativeSnapshot.rows = [
            {
                key: workItem.workItemId,
                kind: { Item: { timeline_index: 0 } },
            },
        ];

        const [row] = projectConversationToRows(nativeSnapshot, {
            semanticWorkItemKeys: new Set([workItem.workItemId]),
        });

        expect(row).toMatchObject({
            type: 'command-execution',
            turnId: 'turn_a',
            startedAtUnixMs: 1_000,
            elapsedLabel: null,
            semanticWorkItem: true,
        });

        const runningSnapshot = {
            ...nativeSnapshot,
            projection: {
                ...nativeSnapshot.projection,
                items: nativeSnapshot.projection.items.map((item) => ({
                    ...item,
                    status: 'Running' as const,
                    updated_at_unix_ms: 1_000,
                    completed_at_unix_ms: null,
                })),
            },
        };
        const [runningRow] = projectConversationToRows(runningSnapshot, {
            nowMs: 3_000,
            semanticWorkItemKeys: new Set([workItem.workItemId]),
        });

        expect(runningRow).toMatchObject({
            type: 'command-execution',
            streaming: true,
            startedAtUnixMs: 1_000,
            elapsedLabel: 'threads:timelineElapsedSeconds',
        });
    });

    it('preserves stalled state and message from native running rows', () => {
        const rows = projectConversationToRows(
            {
                ...snapshot(),
                rows: [
                    {
                        key: 'semantic-running-turn::turn_a',
                        kind: {
                            RunningTurn: {
                                turn_id: 'turn_a',
                                started_at_unix_ms: 1_000,
                                state: 'stalled',
                                message: 'runtime heartbeat overdue',
                            },
                        },
                    },
                ],
            },
            { nowMs: 10_000 },
        );

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            type: 'running',
            turnId: 'turn_a',
            startedAtUnixMs: 1_000,
            state: 'stalled',
            message: 'runtime heartbeat overdue',
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

    it('hides empty terminal reasoning but keeps running and contentful thoughts', () => {
        const emptyCompleted = reasoningWorkItem(
            'work_completed_empty',
            '001',
            'completed',
            ['  '],
            [],
        );
        const emptyRunning = reasoningWorkItem('work_running_empty', '002', 'running', [], []);
        const contentCompleted = reasoningWorkItem(
            'work_completed_content',
            '003',
            'completed',
            [],
            ['analysis'],
        );
        const work = workSummary({
            presentation: 'expanded_live',
            state: 'running',
            workCount: 3,
            visibleWorkCount: 3,
        });
        const rows = projectSemanticTimelineToRows({
            snapshot: snapshot(),
            blocks: [
                workBlock('002', {
                    presentation: 'expanded_live',
                    state: 'running',
                    workCount: 3,
                    visibleWorkCount: 3,
                }),
            ],
            expandedKeys: [],
            workRangesByTurn: {
                turn_a: {
                    work,
                    items: [emptyCompleted, emptyRunning, contentCompleted],
                    hasLoadedPage: true,
                },
            },
            nowMs: 10_000,
        });
        const reasoningRows = rows.filter((row) => row.type === 'reasoning');

        expect(reasoningRows.map((row) => row.itemId)).toEqual([
            emptyRunning.itemId,
            contentCompleted.itemId,
        ]);
        expect(reasoningRows[0]).toMatchObject({
            streaming: true,
            elapsedLabel: 'threads:timelineElapsedSeconds',
        });
        expect(reasoningRows[1]).toMatchObject({
            streaming: false,
            text: 'analysis',
            elapsedLabel: null,
        });
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
            state: 'running',
            message: null,
        });
    });

    it('keeps stalled turn-state rows visible in the paged fallback', () => {
        const rows = projectSemanticTimelineToRows({
            snapshot: snapshot(),
            blocks: [
                userBlock('001'),
                turnStateBlock('002', 'stalled', 'runtime heartbeat overdue'),
            ],
            expandedKeys: [],
            workRangesByTurn: {},
            nowMs: 10_000,
        });

        expect(rows.find((row) => row.type === 'running')).toMatchObject({
            turnId: 'turn_a',
            startedAtUnixMs: 2,
            state: 'stalled',
            message: 'runtime heartbeat overdue',
        });
    });

    it('does not synthesize running row from stale active snapshot state', () => {
        const rows = projectSemanticTimelineToRows({
            snapshot: snapshot({
                composer_locked: true,
                in_flight_turn_id: 'turn_a',
                turns: [
                    {
                        id: 'turn_a',
                        phase: 'Running',
                        started_at_unix_ms: 1_000,
                        completed_at_unix_ms: null,
                        error: null,
                    },
                ],
            }),
            blocks: [userBlock('001')],
            expandedKeys: [],
            workRangesByTurn: {},
            nowMs: 10_000,
        });

        expect(rows.some((row) => row.type === 'running')).toBe(false);
    });

    it('projects pending request blocks into actionable pending request rows', () => {
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

        const requestRow = rows.find((row) => row.type === 'pending-request');

        expect(requestRow).toMatchObject({
            key: 'timeline-pending-request::request_a',
            turnId: 'turn_a',
            entry: {
                thread_id: 'thread_a',
                turn_id: 'turn_a',
                request: {
                    workspace_id: 'workspace_a',
                    request_id: 'request_a',
                    thread_id: 'thread_a',
                    turn_id: 'turn_a',
                    item_id: 'native_item_a',
                    origin: {
                        origin: 'cli_runtime',
                        runtime_id: 'codex',
                    },
                    kind: 'command_approval',
                    title: 'Run command',
                    message: 'Approve command',
                    native_request_id: 'native_request_a',
                    payload: {
                        source: 'cli_runtime',
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
                },
            },
        });
    });

    it('keeps grandchild request scope for pending request blocks projected on a root page', () => {
        const basePendingBlock = pendingRequestBlock('003');
        if (basePendingBlock.kind.kind !== 'pending_request') {
            throw new Error('expected pending request block');
        }

        const rows = projectSemanticTimelineToRows({
            snapshot: snapshot(),
            blocks: [
                {
                    ...basePendingBlock,
                    threadId: 'grandchild_thread',
                    turnId: 'grandchild_turn',
                    kind: {
                        ...basePendingBlock.kind,
                        requestId: 'grandchild_request',
                    },
                },
            ],
            expandedKeys: [],
            workRangesByTurn: {},
            nowMs: 10_000,
        });

        const requestRow = rows.find((row) => row.type === 'pending-request');

        expect(requestRow).toMatchObject({
            key: 'timeline-pending-request::grandchild_request',
            turnId: 'grandchild_turn',
            entry: {
                thread_id: 'grandchild_thread',
                turn_id: 'grandchild_turn',
                request: {
                    request_id: 'grandchild_request',
                    thread_id: 'grandchild_thread',
                    turn_id: 'grandchild_turn',
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

const detachedTaskRunBlock = (sortKey: string, status: 'running' | 'completed'): TimelineBlock => ({
    workspaceId: 'workspace_a',
    threadId: 'thread_a',
    blockId: 'block_detached_task_a',
    turnId: 'task_turn_a',
    sortKey,
    startedAtUnixMs: 1,
    updatedAtUnixMs: status === 'completed' ? 4 : 1,
    kind: {
        kind: 'detached_task_run',
        task: {
            id: 'task_anchor_a',
            taskId: 'task_a',
            runId: 'run_a',
            parentTaskId: null,
            rootTaskId: null,
            title: 'Background analysis',
            status,
            attachment: 'detached',
            triggerKind: 'immediate',
            executorKind: 'agent',
            childThreadId: 'child_a',
            childTurnId: 'child_turn_a',
            agentRole: null,
            depth: 0,
            maxDepth: 3,
            nextFireAt: null,
            progressPreview: status === 'running' ? 'Collecting sources' : null,
            resultPreview: status === 'completed' ? 'Analysis complete' : null,
            errorPreview: null,
            startedAt: 9,
            createdAt: 1,
            updatedAt: status === 'completed' ? 4 : 1,
        },
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

const turnStateBlock = (
    sortKey: string,
    state: TurnWorkState,
    message: string | null,
): TimelineBlock => ({
    workspaceId: 'workspace_a',
    threadId: 'thread_a',
    blockId: `block_turn_state_${sortKey}`,
    turnId: 'turn_a',
    sortKey,
    startedAtUnixMs: 2,
    updatedAtUnixMs: 2,
    kind: {
        kind: 'turn_state',
        state,
        message,
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

const reasoningWorkItem = (
    workItemId: string,
    orderKey: string,
    status: TurnWorkItem['status'],
    summary: string[],
    content: string[],
): TurnWorkItem => ({
    workItemId,
    itemId: `item_${workItemId}`,
    turnId: 'turn_a',
    orderKey,
    itemType: 'reasoning',
    status,
    startedAtUnixMs: 1_000,
    completedAtUnixMs: status === 'running' ? null : 3_000,
    metadata: null,
    item: {
        type: 'reasoning',
        id: `item_${workItemId}`,
        summary,
        content,
    },
});

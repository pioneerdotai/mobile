import type {
    ClientActiveThreadSnapshot,
    ConversationViewState,
    ItemView,
    MarkdownDocument,
    TimelineEntry,
    TimelineEntryStatus,
    TimelineRow as ClientTimelineRow,
    TurnItem as LegacyTurnItem,
} from '@/client/generated/client_active_thread_snapshot';
import type { PendingRequest } from '@/client/generated/pending_request';
import type { TimelineBlock } from '@/client/generated/timeline_block';
import type { TurnWorkBlock } from '@/client/generated/turn_work_block';
import type { TurnWorkItem } from '@/client/generated/turn_work_item';

import { projectConversationToRows } from './conversation/projector';
import type { TimelinePendingRequest, TimelineRow } from './conversation/timeline';

const SEMANTIC_TURN_WORK_GROUP_PREFIX = 'semantic-turn-work-group::';

export type SemanticTurnWorkRange = {
    work: TurnWorkBlock | null;
    items: TurnWorkItem[];
    hasLoadedPage: boolean;
};

type SemanticTimelineRowsInput = {
    snapshot: ClientActiveThreadSnapshot;
    blocks: readonly TimelineBlock[];
    expandedKeys: readonly string[];
    workRangesByTurn: Readonly<Record<string, SemanticTurnWorkRange | undefined>>;
    nowMs?: number;
};

type MutableSemanticProjection = {
    projection: ConversationViewState;
    rows: ClientTimelineRow[];
    pendingRequests: TimelinePendingRequest[];
    workItemRowKeys: Set<string>;
};

export const projectSemanticTimelineToRows = ({
    snapshot,
    blocks,
    expandedKeys,
    workRangesByTurn,
    nowMs,
}: SemanticTimelineRowsInput): TimelineRow[] => {
    const semantic = createMutableSemanticProjection(snapshot);
    const expanded = new Set(expandedKeys);
    const insertedRunningRows = new Set<string>();

    blocks.forEach((block, index) => {
        const currentTurnId = semanticBlockTurnId(block);
        const nextTurnId = blocks[index + 1] ? semanticBlockTurnId(blocks[index + 1]!) : null;

        switch (block.kind.kind) {
            case 'user_message':
                pushUserBlock(semantic, block);
                break;
            case 'assistant_message':
                pushAssistantBlock(semantic, block);
                break;
            case 'turn_work':
                pushTurnWorkBlock(semantic, block, expanded, workRangesByTurn);
                break;
            case 'turn_state':
                pushTurnStateRow(semantic, block, insertedRunningRows);
                break;
            case 'pending_request':
                pushPendingRequestBlock(semantic, block);
                break;
        }

        if (
            block.kind.kind === 'turn_work' &&
            currentTurnId &&
            currentTurnId !== nextTurnId &&
            block.kind.work.presentation === 'expanded_live' &&
            (block.kind.work.state === 'starting' || block.kind.work.state === 'running') &&
            !insertedRunningRows.has(currentTurnId)
        ) {
            pushRunningRow(
                semantic,
                currentTurnId,
                block.kind.work.startedAtUnixMs ?? block.startedAtUnixMs ?? null,
            );
            insertedRunningRows.add(currentTurnId);
        }
    });

    const semanticSnapshot: ClientActiveThreadSnapshot = {
        ...snapshot,
        history_loaded: true,
        history_loading: false,
        projection: {
            ...semantic.projection,
            revision: semanticRevision(blocks, semantic.rows),
        },
        rows: semantic.rows,
    };

    return projectConversationToRows(semanticSnapshot, {
        expandedKeys: expandedKeyRecord(expandedKeys),
        nowMs,
        pendingRequests: semantic.pendingRequests,
    }).map((row) => {
        const taggedRow = semantic.workItemRowKeys.has(row.key)
            ? { ...row, semanticWorkItem: true }
            : row;

        if (taggedRow.type !== 'work-group' || taggedRow.turnId) {
            return taggedRow;
        }

        const turnId = semanticTurnWorkTurnIdFromKey(taggedRow.key);
        return turnId ? { ...taggedRow, turnId } : taggedRow;
    });
};

const createMutableSemanticProjection = (
    snapshot: ClientActiveThreadSnapshot,
): MutableSemanticProjection => ({
    projection: {
        composer_locked: snapshot.projection.composer_locked,
        in_flight_turn_id: snapshot.projection.in_flight_turn_id ?? null,
        items: [],
        last_error: snapshot.projection.last_error ?? null,
        pending_request_id: snapshot.projection.pending_request_id ?? null,
        phase_label: snapshot.projection.phase_label,
        revision: snapshot.projection.revision,
        timeline: [],
        turns: snapshot.projection.turns,
    },
    rows: [],
    pendingRequests: [],
    workItemRowKeys: new Set(),
});

const pushPendingRequestBlock = (semantic: MutableSemanticProjection, block: TimelineBlock) => {
    if (block.kind.kind !== 'pending_request' || block.kind.status !== 'pending') {
        return;
    }

    semantic.pendingRequests.push({
        thread_id: block.threadId,
        turn_id: block.turnId ?? null,
        request: pendingRequestFromBlock(block),
    });
};

const pendingRequestFromBlock = (block: TimelineBlock): PendingRequest => {
    if (block.kind.kind !== 'pending_request') {
        throw new Error('expected pending request block');
    }

    return {
        workspace_id: block.workspaceId,
        request_id: block.kind.requestId,
        thread_id: block.threadId,
        turn_id: block.turnId ?? null,
        item_id: block.kind.itemId ?? null,
        origin: {
            origin: 'cli_runtime',
            runtime_id: block.kind.runtimeId,
        },
        kind: block.kind.request.kind,
        title: block.kind.request.title ?? null,
        message: block.kind.request.message ?? null,
        native_request_id: block.kind.request.native_request_id ?? null,
        payload: {
            source: 'cli_runtime',
            request: block.kind.request,
        },
    };
};

const pushUserBlock = (semantic: MutableSemanticProjection, block: TimelineBlock) => {
    if (block.kind.kind !== 'user_message') {
        return;
    }

    const itemId = block.kind.itemId ?? block.blockId;
    const text = block.kind.text ?? '';
    pushItemRow(semantic, {
        entryId: block.blockId,
        itemId,
        turnId: block.turnId ?? block.blockId,
        itemType: 'user_message',
        status: 'Completed',
        startedAtUnixMs: block.startedAtUnixMs ?? block.updatedAtUnixMs ?? null,
        updatedAtUnixMs: block.updatedAtUnixMs ?? block.startedAtUnixMs ?? null,
        completedAtUnixMs: block.updatedAtUnixMs ?? block.startedAtUnixMs ?? null,
        partialText: text,
        finalText: text,
        partialMarkdown: null,
        finalMarkdown: null,
        item: {
            type: 'userMessage',
            id: itemId,
            text,
            attachments: block.kind.attachments ?? [],
        } as LegacyTurnItem,
        opaqueMeta: null,
    });
};

const pushAssistantBlock = (semantic: MutableSemanticProjection, block: TimelineBlock) => {
    if (block.kind.kind !== 'assistant_message') {
        return;
    }

    const status =
        (block.kind as typeof block.kind & { status?: TurnWorkItem['status'] }).status ??
        'completed';
    const terminal = status !== 'running';

    pushItemRow(semantic, {
        entryId: block.blockId,
        itemId: block.kind.itemId,
        turnId: block.turnId ?? block.blockId,
        itemType: 'agent_message',
        status: turnWorkItemStatus(status),
        startedAtUnixMs: block.startedAtUnixMs ?? block.updatedAtUnixMs ?? null,
        updatedAtUnixMs: block.updatedAtUnixMs ?? block.startedAtUnixMs ?? null,
        completedAtUnixMs: terminal
            ? (block.updatedAtUnixMs ?? block.startedAtUnixMs ?? null)
            : null,
        partialText: block.kind.text,
        finalText: terminal ? block.kind.text : null,
        partialMarkdown: (block.kind.markdown as MarkdownDocument | null | undefined) ?? null,
        finalMarkdown: terminal
            ? ((block.kind.markdown as MarkdownDocument | null | undefined) ?? null)
            : null,
        item: {
            type: 'agentMessage',
            id: block.kind.itemId,
            text: block.kind.text,
            phase: 'final_answer',
            markdown: block.kind.markdown ?? null,
            markdownVersion: null,
        } as LegacyTurnItem,
        opaqueMeta: null,
    });
};

const pushTurnWorkBlock = (
    semantic: MutableSemanticProjection,
    block: TimelineBlock,
    expandedKeys: ReadonlySet<string>,
    workRangesByTurn: Readonly<Record<string, SemanticTurnWorkRange | undefined>>,
) => {
    if (block.kind.kind !== 'turn_work') {
        return;
    }

    const work = block.kind.work;
    const toggleKey = semanticTurnWorkToggleKey(work.turnId);
    const expanded =
        work.presentation === 'expanded_live' ||
        work.presentation === 'expanded_terminal_no_final' ||
        expandedKeys.has(toggleKey);

    if (work.presentation === 'collapsed_after_final' && work.workCount > 0) {
        semantic.rows.push({
            key: toggleKey,
            kind: {
                TurnWorkToggle: {
                    toggle_key: toggleKey,
                    anchor_entry_id: block.blockId,
                    elapsed_ms: work.elapsedMs ?? null,
                    is_open: expanded,
                },
            },
        });
    }

    if (!expanded) {
        return;
    }

    for (const item of workRangesByTurn[work.turnId]?.items ?? []) {
        pushTurnWorkItem(semantic, item);
    }
};

const pushTurnWorkItem = (semantic: MutableSemanticProjection, item: TurnWorkItem) => {
    const { text, markdown } = turnItemTextAndMarkdown(item.item);
    const terminal = item.status !== 'running';

    semantic.workItemRowKeys.add(item.workItemId);
    semantic.workItemRowKeys.add(projectedTimelineRowKeyForTurnWorkItem(item));
    pushItemRow(semantic, {
        entryId: item.workItemId,
        itemId: item.itemId,
        turnId: item.turnId,
        itemType: turnItemTypeLabel(item.itemType),
        status: turnWorkItemStatus(item.status),
        startedAtUnixMs: item.startedAtUnixMs ?? item.completedAtUnixMs ?? null,
        updatedAtUnixMs: item.completedAtUnixMs ?? item.startedAtUnixMs ?? null,
        completedAtUnixMs: terminal ? (item.completedAtUnixMs ?? null) : null,
        partialText: text,
        finalText: terminal ? text : null,
        partialMarkdown: markdown,
        finalMarkdown: terminal ? markdown : null,
        item: item.item as LegacyTurnItem,
        opaqueMeta: item.metadata ?? null,
    });
};

const pushTurnStateRow = (
    semantic: MutableSemanticProjection,
    block: TimelineBlock,
    insertedRunningRows: Set<string>,
) => {
    if (block.kind.kind !== 'turn_state') {
        return;
    }
    if (block.kind.state !== 'starting' && block.kind.state !== 'running') {
        return;
    }

    const turnId = block.turnId ?? null;
    if (!turnId || insertedRunningRows.has(turnId)) {
        return;
    }

    pushRunningRow(semantic, turnId, block.startedAtUnixMs ?? block.updatedAtUnixMs ?? null);
    insertedRunningRows.add(turnId);
};

const pushRunningRow = (
    semantic: MutableSemanticProjection,
    turnId: string,
    startedAtUnixMs: number | null,
) => {
    semantic.rows.push({
        key: `semantic-running-turn::${turnId}`,
        kind: {
            RunningTurn: {
                turn_id: turnId,
                started_at_unix_ms: startedAtUnixMs,
            },
        },
    });
};

type PushItemRowInput = {
    entryId: string;
    itemId: string;
    turnId: string;
    itemType: string;
    status: TimelineEntryStatus;
    startedAtUnixMs: number | null;
    updatedAtUnixMs: number | null;
    completedAtUnixMs: number | null;
    partialText: string;
    finalText: string | null;
    partialMarkdown: MarkdownDocument | null;
    finalMarkdown: MarkdownDocument | null;
    item: LegacyTurnItem;
    opaqueMeta: unknown;
};

const pushItemRow = (semantic: MutableSemanticProjection, input: PushItemRowInput) => {
    const itemIndex = semantic.projection.items.length;
    const timelineIndex = semantic.projection.timeline.length;

    semantic.projection.items.push({
        id: input.itemId,
        turn_id: input.turnId,
        item_type: input.itemType,
        status: input.status,
        started_at_unix_ms: input.startedAtUnixMs,
        updated_at_unix_ms: input.updatedAtUnixMs,
        completed_at_unix_ms: input.completedAtUnixMs,
        partial_text: input.partialText,
        final_text: input.finalText,
        partial_markdown: input.partialMarkdown,
        final_markdown: input.finalMarkdown,
        item: input.item,
        timeline_origin: null,
        opaque_meta: input.opaqueMeta,
    } satisfies ItemView);
    semantic.projection.timeline.push({
        id: input.entryId,
        turn_id: input.turnId,
        item_id: input.itemId,
        item_index: itemIndex,
    } satisfies TimelineEntry);
    semantic.rows.push({
        key: input.entryId,
        kind: { Item: { timeline_index: timelineIndex } },
    });
};

const semanticBlockTurnId = (block: TimelineBlock): string | null => {
    if (block.kind.kind === 'turn_work') {
        return block.kind.work.turnId;
    }

    return block.turnId ?? null;
};

const semanticTurnWorkToggleKey = (turnId: string) => {
    return `${SEMANTIC_TURN_WORK_GROUP_PREFIX}${turnId}`;
};

const semanticTurnWorkTurnIdFromKey = (key: string): string | null => {
    if (!key.startsWith(SEMANTIC_TURN_WORK_GROUP_PREFIX)) {
        return null;
    }

    const turnId = key.slice(SEMANTIC_TURN_WORK_GROUP_PREFIX.length);
    return turnId.length > 0 ? turnId : null;
};

const expandedKeyRecord = (expandedKeys: readonly string[]) => {
    return expandedKeys.reduce<Record<string, boolean>>((acc, key) => {
        acc[key] = true;
        return acc;
    }, {});
};

const turnWorkItemStatus = (status: TurnWorkItem['status']): TimelineEntryStatus => {
    switch (status) {
        case 'running':
            return 'Running';
        case 'blocked':
            return 'Blocked';
        case 'failed':
            return 'Failed';
        case 'cancelled':
            return 'Cancelled';
        default:
            return 'Completed';
    }
};

const turnItemTypeLabel = (itemType: TurnWorkItem['itemType']) => {
    switch (itemType) {
        case 'user_message':
            return 'user_message';
        case 'agent_message':
            return 'agent_message';
        case 'reasoning':
            return 'reasoning';
        case 'system_event':
            return 'system_event';
        case 'task':
            return 'task';
        case 'command_execution':
            return 'command_execution';
        case 'file_change':
            return 'file_change';
        case 'web_search':
            return 'web_search';
        case 'web_fetch':
            return 'web_fetch';
        case 'download':
            return 'download';
        case 'dynamic_tool_call':
            return 'dynamic_tool_call';
    }
};

const turnItemTextAndMarkdown = (
    item: TurnWorkItem['item'],
): { text: string; markdown: MarkdownDocument | null } => {
    switch (item.type) {
        case 'userMessage':
            return { text: item.text, markdown: null };
        case 'agentMessage':
            return {
                text: item.text,
                markdown: (item.markdown as MarkdownDocument | null | undefined) ?? null,
            };
        case 'reasoning': {
            const content = item.content ?? [];
            return {
                text: content.length > 0 ? content.join('\n') : (item.summary ?? []).join('\n'),
                markdown: null,
            };
        }
        case 'systemEvent':
            return { text: item.message, markdown: null };
        default:
            return { text: '', markdown: null };
    }
};

const projectedTimelineRowKeyForTurnWorkItem = (item: TurnWorkItem): string => {
    const itemType = item.item.type;

    switch (itemType) {
        case 'userMessage':
            return `user-message:${item.itemId}`;
        case 'agentMessage':
            return `assistant-message:${item.itemId}`;
        case 'reasoning':
            return `reasoning:${item.itemId}`;
        case 'systemEvent':
            return `system-event:${item.itemId}`;
        case 'task':
            return `task-anchor:${item.itemId}`;
        case 'commandExecution':
            return `command-execution:${item.itemId}`;
        case 'fileChange':
            return `file-change:${item.itemId}`;
        case 'webSearch':
        case 'webFetch':
        case 'download':
        case 'dynamicToolCall':
            return `tool-call:${item.itemId}`;
        default:
            return `unknown:${item.itemId}`;
    }
};

const semanticRevision = (
    blocks: readonly TimelineBlock[],
    rows: readonly ClientTimelineRow[],
): number => {
    let hash = blocks.length * 31 + rows.length;
    for (const block of blocks) {
        hash = stringHash(block.blockId, hash);
        hash = stringHash(block.sortKey, hash);
    }
    for (const row of rows) {
        hash = stringHash(row.key, hash);
    }

    return Math.abs(hash);
};

const stringHash = (value: string, seed: number) => {
    let hash = seed | 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 33) ^ value.charCodeAt(index);
    }
    return hash | 0;
};

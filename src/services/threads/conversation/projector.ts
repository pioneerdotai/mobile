import type {
    ClientActiveThreadSnapshot,
    ConversationViewState,
    ItemView,
    MarkdownDocument,
    TimelineCoalescedToolsKind,
    TimelineEntryStatus,
    TimelineRow as ClientTimelineRow,
    TurnItem,
    UserMessageAttachment,
} from '@/client/generated/client_active_thread_snapshot';
import i18n from '@/locale/i18n';

import type {
    TimelineCapabilityRejection,
    TimelinePendingRequest,
    TimelineRow,
    TimelineUserAttachment,
} from './timeline';
import { commandLineFromCommandExecution } from './command-display';
import { ensureTimelineRowRenderFingerprint } from './render-fingerprint';
import { taskWaitReviewDisplay } from '@/services/tasks/review';

const FILE_CHANGE_OUTPUT_LIMIT = 4_000;
const DYNAMIC_TOOL_RESULT_LIMIT = 4_000;
const SEMANTIC_TURN_WORK_GROUP_PREFIX = 'semantic-turn-work-group::';

type ProjectConversationRowsOptions = {
    expandedKeys?: ReadonlySet<string> | Readonly<Record<string, boolean>>;
    nowMs?: number;
    pendingRequests?: readonly TimelinePendingRequest[];
    semanticWorkItemKeys?: ReadonlySet<string>;
    rowRenderFingerprints?: Readonly<Record<string, string>>;
};

type CoalescedToolsModel = Extract<TimelineRow, { type: 'tool-group' }>;

type TimelineItemStatus =
    'pending' | 'streaming' | 'completed' | 'failed' | 'cancelled' | 'unknown';

const tt = (key: string, options?: Record<string, unknown>): string => {
    return String(i18n.t(`threads:${key}`, options));
};

export const projectConversationToRows = (
    conversation: ClientActiveThreadSnapshot,
    options: ProjectConversationRowsOptions = {},
): TimelineRow[] => {
    const rows = projectClientConversationRows(conversation.projection, conversation.rows, {
        ...options,
        rowRenderFingerprints: conversation.row_render_fingerprints ?? {},
    });
    return insertPendingRequestRows(rows, options.pendingRequests ?? []).map((row) =>
        ensureTimelineRowRenderFingerprint(row),
    );
};

const projectClientConversationRows = (
    projection: ConversationViewState,
    clientRows: ClientTimelineRow[],
    options: ProjectConversationRowsOptions,
): TimelineRow[] => {
    const itemsById = new Map(projection.items.map((item) => [item.id, item]));

    return clientRows
        .map((row) => projectClientConversationRow(projection, clientRows, itemsById, row, options))
        .filter((row): row is TimelineRow => row !== null);
};

const insertPendingRequestRows = (
    rows: TimelineRow[],
    pendingRequests: readonly TimelinePendingRequest[],
): TimelineRow[] => {
    if (pendingRequests.length === 0) {
        return rows;
    }

    const requestRows = pendingRequests.map(projectPendingRequestToRow);
    const runningIndex = rows.findIndex((row) => row.type === 'running');

    if (runningIndex < 0) {
        return [...rows, ...requestRows];
    }

    return [...rows.slice(0, runningIndex), ...requestRows, ...rows.slice(runningIndex)];
};

const projectPendingRequestToRow = (entry: TimelinePendingRequest): TimelineRow => ({
    type: 'pending-request',
    key: `timeline-pending-request::${entry.request.request_id}`,
    turnId: entry.turn_id,
    entry,
});

const projectClientConversationRow = (
    projection: ConversationViewState,
    clientRows: ClientTimelineRow[],
    itemsById: ReadonlyMap<string, ItemView>,
    row: ClientTimelineRow,
    options: ProjectConversationRowsOptions,
): TimelineRow | null => {
    const projected = projectClientConversationRowContent(
        projection,
        clientRows,
        itemsById,
        row,
        options,
    );
    return projected
        ? ensureTimelineRowRenderFingerprint(
              projected,
              options.rowRenderFingerprints?.[row.key] ?? null,
          )
        : null;
};

const projectClientConversationRowContent = (
    projection: ConversationViewState,
    clientRows: ClientTimelineRow[],
    itemsById: ReadonlyMap<string, ItemView>,
    row: ClientTimelineRow,
    options: ProjectConversationRowsOptions,
): TimelineRow | null => {
    if ('Item' in row.kind) {
        const entry = projection.timeline[row.kind.Item.timeline_index];
        const item = entry ? itemsById.get(entry.item_id) : null;
        const projected = item ? projectItemToRow(item, options.nowMs) : null;
        if (!projected || !item) {
            return null;
        }

        return {
            ...projected,
            key: row.key,
            startedAtUnixMs: item.started_at_unix_ms ?? null,
            ...(options.semanticWorkItemKeys?.has(row.key) ? { semanticWorkItem: true } : {}),
        };
    }

    if ('UserMessage' in row.kind) {
        const entry = projection.timeline[row.kind.UserMessage.timeline_index];
        const item = entry ? itemsById.get(entry.item_id) : null;
        const projected = item ? projectItemToRow(item, options.nowMs) : null;
        if (!projected || projected.type !== 'user-message' || !item) {
            return null;
        }
        const presentation = row.kind.UserMessage.presentation;
        const replyState =
            'reply_state' in presentation
                ? ((presentation.reply_state as
                      'available' | 'deleted' | 'unavailable' | null | undefined) ?? null)
                : presentation.reply
                  ? presentation.reply.deleted
                      ? 'deleted'
                      : presentation.reply.text || presentation.reply.author
                        ? 'available'
                        : 'unavailable'
                  : null;
        return {
            ...projected,
            key: row.key,
            startedAtUnixMs: item.started_at_unix_ms ?? null,
            text: presentation.deleted ? '' : projected.text,
            attachments: presentation.deleted
                ? []
                : projectUserMessageAttachments(presentation.attachments ?? []),
            mode: presentation.mode,
            author: presentation.author ?? null,
            reply: presentation.reply ?? null,
            replyState,
            mentions: presentation.deleted ? [] : (presentation.mentions ?? []),
            revision: presentation.revision,
            edited: presentation.edited,
            deleted: presentation.deleted,
        };
    }

    if ('TurnWorkToggle' in row.kind) {
        const group = row.kind.TurnWorkToggle;
        const anchorEntry = projection.timeline.find((entry) => entry.id === group.anchor_entry_id);
        const anchorItem = anchorEntry ? itemsById.get(anchorEntry.item_id) : null;
        const toggleKey = group.toggle_key || row.key;
        const semanticTurnId = semanticTurnWorkTurnIdFromKey(toggleKey);

        return {
            type: 'work-group',
            key: toggleKey,
            turnId: anchorEntry?.turn_id ?? anchorItem?.turn_id ?? semanticTurnId ?? '',
            anchorItemId: anchorItem?.id ?? anchorEntry?.item_id ?? '',
            anchorEntryId: group.anchor_entry_id,
            title: tt('timelineWorked'),
            elapsedMs: group.elapsed_ms ?? null,
            elapsedLabel: group.elapsed_ms == null ? null : formatElapsedMs(group.elapsed_ms),
            expanded: expandedContains(options.expandedKeys, toggleKey),
        };
    }

    if ('CoalescedTools' in row.kind) {
        const group = row.kind.CoalescedTools;
        const toggleKey = group.toggle_key || row.key;
        const turnId = coalescedToolsTurnId(projection, clientRows, row);

        return {
            type: 'tool-group',
            key: toggleKey,
            turnId,
            kind: coalescedToolsKind(group.kind),
            title: coalescedToolsLabel(coalescedToolsKind(group.kind), group.count),
            count: group.count,
            status: 'completed',
            expanded: expandedContains(options.expandedKeys, toggleKey),
            items: [],
        };
    }

    if ('RunningTurn' in row.kind) {
        const runningTurn = row.kind.RunningTurn;
        const nowMs = options.nowMs ?? Date.now();
        const startedAtUnixMs = runningTurn.started_at_unix_ms ?? null;
        const elapsedMs = Math.max(0, nowMs - (startedAtUnixMs ?? nowMs));

        return {
            type: 'running',
            key: row.key,
            turnId: runningTurn.turn_id,
            startedAtUnixMs,
            elapsedLabel: elapsedMs >= 1_000 ? formatElapsedMs(elapsedMs) : null,
            state: runningTurn.state ?? null,
            message: runningTurn.message ?? null,
            securitySummary: runningTurn.security_summary ?? null,
        };
    }

    return null;
};

const coalescedToolsTurnId = (
    projection: ConversationViewState,
    rows: ClientTimelineRow[],
    row: ClientTimelineRow,
): string => {
    const rowIndex = rows.findIndex((candidate) => candidate.key === row.key);
    const nextItemRow = rows.slice(Math.max(rowIndex + 1, 0)).find((candidate) => {
        return 'Item' in candidate.kind;
    });

    if (nextItemRow && 'Item' in nextItemRow.kind) {
        return projection.timeline[nextItemRow.kind.Item.timeline_index]?.turn_id ?? '';
    }

    return projection.timeline[0]?.turn_id ?? '';
};

const coalescedToolsKind = (kind: TimelineCoalescedToolsKind): CoalescedToolsModel['kind'] => {
    switch (kind) {
        case 'CompletedTaskTools':
            return 'completedTaskTools';
        case 'RepeatedTaskWait':
            return 'repeatedTaskWait';
    }
};

const coalescedToolsLabel = (kind: CoalescedToolsModel['kind'], count: number): string => {
    switch (kind) {
        case 'completedTaskTools':
            return tt('timelineCompletedToolCalls', { count });
        case 'repeatedTaskWait':
            return tt('timelineRepeatedTaskWaitCalls', { count });
    }
};

const expandedContains = (
    expandedKeys: ProjectConversationRowsOptions['expandedKeys'],
    key: string,
): boolean => {
    if (!expandedKeys) {
        return false;
    }

    if ('has' in expandedKeys && typeof expandedKeys.has === 'function') {
        return expandedKeys.has(key);
    }

    return (expandedKeys as Readonly<Record<string, boolean>>)[key] === true;
};

const semanticTurnWorkTurnIdFromKey = (key: string): string | null => {
    if (!key.startsWith(SEMANTIC_TURN_WORK_GROUP_PREFIX)) {
        return null;
    }

    return key.slice(SEMANTIC_TURN_WORK_GROUP_PREFIX.length) || null;
};

export const formatElapsedMs = (elapsedMs: number): string => {
    const totalSeconds = Math.floor(elapsedMs / 1_000);
    const hours = Math.floor(totalSeconds / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return tt('timelineElapsedHours', {
            hours,
            minutes: minutes.toString().padStart(2, '0'),
        });
    }

    if (minutes > 0) {
        return tt('timelineElapsedMinutes', {
            minutes,
            seconds: seconds.toString().padStart(2, '0'),
        });
    }

    return tt('timelineElapsedSeconds', { seconds });
};

const itemStatus = (status: TimelineEntryStatus): TimelineItemStatus => {
    switch (status) {
        case 'Running':
            return 'streaming';
        case 'Completed':
            return 'completed';
        case 'Blocked':
        case 'Failed':
            return 'failed';
        case 'Cancelled':
            return 'cancelled';
        default:
            return 'unknown';
    }
};

const isRunningStatus = (status: TimelineEntryStatus): boolean => {
    return status === 'Running';
};

const itemText = (item: ItemView): string => {
    return item.final_text || item.partial_text || '';
};

const itemPartialText = (item: ItemView): string => {
    return item.partial_text || '';
};

const itemFinalText = (item: ItemView): string => {
    return item.final_text || '';
};

const formatElapsed = (item: ItemView, nowMs?: number): string | null => {
    if (!isRunningStatus(item.status)) {
        return null;
    }
    const started = item.started_at_unix_ms ?? null;
    if (started === null) {
        return null;
    }

    return formatElapsedMs(Math.max(0, (nowMs ?? Date.now()) - started));
};

const formatTimestamp = (timestamp: number | null | undefined): string => {
    if (timestamp == null) {
        return '';
    }

    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
};

const formatTimelineTimestamp = (item: ItemView): string =>
    formatTimestamp(
        item.started_at_unix_ms ?? item.updated_at_unix_ms ?? item.completed_at_unix_ms,
    );

const formatLastEditedTimestamp = (item: ItemView): string =>
    formatTimestamp(
        item.updated_at_unix_ms ?? item.started_at_unix_ms ?? item.completed_at_unix_ms,
    );

const isTaskTimelineItem = (item: ItemView): boolean => {
    const origin = item.timeline_origin;
    return !!origin && (!!origin.taskId || !!origin.runId || !!origin.childTurnId);
};

const finalFileChangeStatus = (
    status: TimelineEntryStatus,
    success: boolean | null | undefined,
    exitCode: number | null | undefined,
): { label: string; successful: boolean } => {
    if (status === 'Cancelled') {
        return { label: tt('timelineCancelled'), successful: false };
    }

    if (status === 'Failed' || status === 'Blocked') {
        return { label: tt('timelineChangesNotApplied'), successful: false };
    }

    if (status === 'Running') {
        return { label: tt('timelineApplyingChanges'), successful: true };
    }

    if (success === false || (exitCode !== null && exitCode !== undefined && exitCode !== 0)) {
        return { label: tt('timelineChangesNotApplied'), successful: false };
    }

    return { label: tt('timelineFilesChanged'), successful: true };
};

const finalToolStatus = (
    status: TimelineEntryStatus,
    item: Extract<TurnItem, { type: 'webSearch' | 'webFetch' | 'download' | 'dynamicToolCall' }>,
): { label: string; successful: boolean } => {
    if (status === 'Cancelled') {
        return { label: tt('timelineCancelled'), successful: false };
    }

    if (status === 'Failed' || status === 'Blocked' || item.status === 'failed') {
        return { label: toolFailedLabel(item.type), successful: false };
    }

    if (status === 'Running' || item.status === 'in_progress') {
        return { label: toolRunningLabel(item.type), successful: true };
    }

    const httpFailed =
        (item.type === 'webFetch' || item.type === 'download') &&
        item.statusCode !== null &&
        item.statusCode !== undefined &&
        item.statusCode >= 400;
    if (item.success === false || httpFailed) {
        return { label: toolFailedLabel(item.type), successful: false };
    }

    return { label: toolCompletedLabel(item.type), successful: true };
};

const toolRunningLabel = (type: string): string => {
    switch (type) {
        case 'webSearch':
            return tt('timelineSearchingWeb');
        case 'webFetch':
            return tt('timelineOpeningLink');
        case 'download':
            return tt('timelineDownloadingFile');
        default:
            return tt('timelineRunningTool');
    }
};

const toolCompletedLabel = (type: string): string => {
    switch (type) {
        case 'webFetch':
            return tt('timelineLoaded');
        case 'download':
            return tt('timelineFileDownloaded');
        default:
            return tt('timelineCompleted');
    }
};

const toolFailedLabel = (type: string): string => {
    switch (type) {
        case 'webFetch':
            return tt('timelineFailedToOpen');
        case 'download':
            return tt('timelineDownloadFailed');
        default:
            return tt('timelineFailed');
    }
};

const projectItemToRow = (item: ItemView, nowMs?: number): TimelineRow => {
    const turnItem = item.item;
    const text = itemText(item);
    const partialText = itemPartialText(item);
    const finalText = itemFinalText(item);
    const status = itemStatus(item.status);

    switch (turnItem?.type) {
        case 'userMessage':
            return {
                type: 'user-message',
                key: rowKey('user-message', item.id),
                itemId: item.id,
                turnId: item.turn_id,
                text: turnItem.text || text,
                attachments: readUserMessageAttachments(turnItem),
                timestampLabel: formatTimelineTimestamp(item),
                lastEditedTimestampLabel: formatLastEditedTimestamp(item),
                mode: null,
                author: null,
                reply: null,
                replyState: null,
                mentions: [],
                revision: 0,
                edited: false,
                deleted: false,
            };
        case 'agentMessage':
            return {
                type: 'assistant-message',
                key: rowKey('assistant-message', item.id),
                itemId: item.id,
                turnId: item.turn_id,
                text:
                    item.status === 'Running'
                        ? partialText || turnItem.text || text
                        : turnItem.text || finalText || partialText,
                markdown:
                    item.final_markdown ??
                    item.partial_markdown ??
                    (turnItem.markdown as MarkdownDocument | null | undefined) ??
                    null,
                phase: turnItem.phase ?? 'final_answer',
                streaming: isRunningStatus(item.status),
                taskTimeline: isTaskTimelineItem(item),
                elapsedLabel: formatElapsed(item, nowMs),
                timestampLabel: formatTimelineTimestamp(item),
            };
        case 'reasoning':
            return {
                type: 'reasoning',
                key: rowKey('reasoning', item.id),
                itemId: item.id,
                turnId: item.turn_id,
                text,
                markdown: item.final_markdown ?? item.partial_markdown ?? null,
                collapsed: item.status === 'Completed',
                streaming: isRunningStatus(item.status),
                elapsedLabel: formatElapsed(item, nowMs),
            };
        case 'systemEvent':
            return {
                type: 'system-event',
                key: rowKey('system-event', item.id),
                itemId: item.id,
                turnId: item.turn_id,
                level: turnItem.level,
                message: turnItem.message || text,
                code: turnItem.code ?? null,
                details: turnItem.details ?? null,
                label: systemEventLabel(turnItem.level, turnItem.code ?? null, turnItem.details),
                capabilityRejections: capabilityRejectionRowsForEvent(
                    turnItem.code ?? null,
                    turnItem.details,
                ),
            };
        case 'task':
            return {
                type: 'task-anchor',
                key: rowKey('task-anchor', item.id),
                itemId: item.id,
                turnId: item.turn_id,
                taskId: turnItem.taskId,
                runId: turnItem.runId ?? null,
                childThreadId: turnItem.childThreadId ?? null,
                childTurnId: turnItem.childTurnId ?? null,
                agentRole: turnItem.agentRole ?? null,
                depth: turnItem.depth ?? 0,
                maxDepth: turnItem.maxDepth ?? 0,
                title: turnItem.title,
                status: turnItem.status,
                startedAtUnixMs: item.started_at_unix_ms ?? null,
                elapsedLabel: formatElapsed(item, nowMs),
                progressPreview:
                    typeof turnItem.progressPreview === 'string' ? turnItem.progressPreview : null,
                resultPreview: turnItem.resultPreview ?? null,
                errorPreview: turnItem.errorPreview ?? null,
            };
        case 'commandExecution': {
            const command = commandLineFromCommandExecution(turnItem);
            const shell = commandShellDetails(turnItem);
            const outputPreview = shell.output || partialText;
            return {
                type: 'command-execution',
                key: rowKey('command-execution', item.id),
                itemId: item.id,
                turnId: item.turn_id,
                status,
                command,
                cwd: turnItem.cwd ?? null,
                durationMs: shell.durationMs,
                exitCode: shell.exitCode,
                outputPreview,
                terminalText: commandTerminalText(command, outputPreview),
                timedOut: shell.timedOut,
                truncated: shell.truncated,
                streaming: isRunningStatus(item.status),
                elapsedLabel: formatElapsed(item, nowMs),
            };
        }
        case 'fileChange': {
            const fileOutput = fileChangeOutput(turnItem, partialText);
            const filePaths = turnItem.changedFiles ?? [];
            const final = finalFileChangeStatus(item.status, turnItem.success, turnItem.exitCode);
            return {
                type: 'file-change',
                key: rowKey('file-change', item.id),
                itemId: item.id,
                turnId: item.turn_id,
                status,
                path: filePaths[0] ?? '',
                paths: filePaths,
                summary: fileChangeSummary(turnItem, filePaths),
                finalStatus: final.label,
                successful: final.successful,
                elapsedLabel: formatElapsed(item, nowMs),
                exitCode: turnItem.exitCode ?? null,
                output: fileOutput,
            };
        }
        case 'webSearch':
        case 'webFetch':
        case 'download':
        case 'dynamicToolCall': {
            const toolDetails = toolCallDetails(turnItem, partialText || text);
            const final = finalToolStatus(item.status, turnItem);
            return {
                type: 'tool-call',
                key: rowKey('tool-call', item.id),
                itemId: item.id,
                turnId: item.turn_id,
                status,
                toolKind: turnItem.type,
                title:
                    toolDetails.mcpServerName && toolDetails.mcpRawToolName
                        ? `${toolDetails.mcpServerName}/${toolDetails.mcpRawToolName}`
                        : turnItem.toolName,
                detail: toolDetails.detail,
                finalStatus: final.label,
                successful: final.successful,
                elapsedLabel: formatElapsed(item, nowMs),
                argumentsText:
                    turnItem.type === 'dynamicToolCall'
                        ? prettyJsonForTimeline(turnItem.arguments)
                        : null,
                resultText:
                    turnItem.type === 'dynamicToolCall'
                        ? dynamicToolResultText(turnItem.display)
                        : null,
                url: toolDetails.url,
                host: toolDetails.host,
                statusCode: toolDetails.statusCode,
                resultCount: toolDetails.resultCount,
                results: toolDetails.results,
                bytes: toolDetails.bytes,
                path: toolDetails.path,
                contentType: toolDetails.contentType,
                mcpServerId: toolDetails.mcpServerId,
                mcpServerName: toolDetails.mcpServerName,
                mcpRawToolName: toolDetails.mcpRawToolName,
                mcpDetails: toolDetails.mcpDetails,
                taskReview:
                    turnItem.type === 'dynamicToolCall'
                        ? taskWaitReviewDisplay(turnItem.toolName, turnItem.display)
                        : null,
            };
        }
        default:
            return {
                type: 'unknown',
                key: rowKey('unknown', item.id),
                itemId: item.id,
                turnId: item.turn_id,
                label: item.item_type || 'unknown',
            };
    }
};

const rowKey = (type: TimelineRow['type'], id: string) => {
    return `${type}:${id}`;
};

const readUserMessageAttachments = (
    item: Extract<TurnItem, { type: 'userMessage' }>,
): TimelineUserAttachment[] => projectUserMessageAttachments(item.attachments ?? []);

const projectUserMessageAttachments = (
    attachments: readonly UserMessageAttachment[],
): TimelineUserAttachment[] => {
    return attachments
        .map(userMessageAttachmentToTimelineAttachment)
        .filter((attachment): attachment is TimelineUserAttachment => !!attachment);
};

const userMessageAttachmentToTimelineAttachment = (
    attachment: UserMessageAttachment,
): TimelineUserAttachment | null => {
    switch (attachment.type) {
        case 'artifact':
            return {
                id: `artifact:${attachment.artifact.artifact_id}:${attachment.artifact.version_id ?? 'latest'}`,
                label: attachment.artifact.display_name,
                kind: 'artifact',
                artifact: attachment.artifact,
            };
        case 'skill':
            return {
                id: `skill:${attachment.capability.skillId}`,
                label: attachment.capability.pack
                    ? `${attachment.capability.pack.label} / ${attachment.capability.label}`
                    : attachment.capability.label,
                kind: 'skill',
                artifact: null,
            };
        case 'skillPack':
            return {
                id: `skill-pack:${attachment.capability.packId}`,
                label: attachment.capability.label,
                kind: 'skill',
                artifact: null,
            };
        case 'mcpServer':
        case 'mcpTool':
            return {
                id: attachment.capability.id,
                label: attachment.capability.label,
                kind: 'mcp',
                artifact: null,
            };
        case 'image':
            return sourceAttachment(attachment.url, 'image');
        case 'localImage':
            return sourceAttachment(attachment.path, 'image');
        case 'audio':
            return sourceAttachment(attachment.url, 'audio');
        case 'localAudio':
            return sourceAttachment(attachment.path, 'audio');
        case 'video':
            return sourceAttachment(attachment.url, 'video');
        case 'localVideo':
            return sourceAttachment(attachment.path, 'video');
        case 'file':
            return sourceAttachment(attachment.url, 'file');
        case 'localFile':
            return sourceAttachment(attachment.path, 'file');
        default:
            return null;
    }
};

const sourceAttachment = (
    source: string,
    kind: TimelineUserAttachment['kind'],
): TimelineUserAttachment => {
    return {
        id: `${kind}:${source}`,
        label: displayNameFromAttachmentSource(source),
        kind,
        artifact: null,
    };
};

const displayNameFromAttachmentSource = (source: string): string => {
    if (source.includes('://') || source.startsWith('data:')) {
        const withoutQuery = source.split('?')[0] ?? source;
        const withoutFragment = withoutQuery.split('#')[0] ?? withoutQuery;
        const candidate = withoutFragment.split('/').filter(Boolean).at(-1);
        return candidate || source;
    }

    const candidate = source.split('/').filter(Boolean).at(-1);
    return candidate || source;
};

const capabilityRejectionRowsForEvent = (
    code: string | null,
    details: unknown,
): TimelineCapabilityRejection[] => {
    if (code !== 'capability.rejected') {
        return [];
    }

    const rejected = asRecord(details).rejected;
    if (!Array.isArray(rejected)) {
        return [];
    }

    return rejected
        .map((item) => {
            const record = asRecord(item);
            const kind = asRecord(record.kind);
            const message = readString(record, 'message')?.trim();
            if (!message) {
                return null;
            }

            return {
                id: readString(record, 'id') ?? `capability:${capabilityLabel(kind)}`,
                label:
                    readString(record, 'label')?.trim() ||
                    capabilityLabel(kind) ||
                    tt('timelineCapability'),
                kind: capabilityKindLabel(kind),
                message,
            };
        })
        .filter((row): row is TimelineCapabilityRejection => !!row);
};

const capabilityKindLabel = (kind: Record<string, unknown>): string => {
    switch (readString(kind, 'type')) {
        case 'skill':
            return tt('timelineSkill');
        case 'mcpServer':
            return tt('timelineMcpServer');
        case 'mcpTool':
            return tt('timelineMcpTool');
        default:
            return tt('timelineCapability');
    }
};

const capabilityLabel = (kind: Record<string, unknown>): string => {
    switch (readString(kind, 'type')) {
        case 'skill':
            return readString(kind, 'slug') ?? 'skill';
        case 'mcpServer':
            return readString(kind, 'name') ?? tt('timelineMcpServer');
        case 'mcpTool': {
            const server = readString(kind, 'serverName') ?? 'MCP';
            const tool = readString(kind, 'rawToolName') ?? 'tool';
            return `${server}/${tool}`;
        }
        default:
            return tt('timelineCapability');
    }
};

const fileChangeSummary = (
    item: Extract<TurnItem, { type: 'fileChange' }>,
    changedFiles: string[],
): string => {
    if (changedFiles.length === 0) {
        return item.toolName || tt('timelineFileChanges');
    }

    if (changedFiles.length === 1) {
        return tt('timelineOneFile');
    }

    return tt('timelineFileCount', { count: changedFiles.length });
};

const systemEventLabel = (level: string, code: string | null, details: unknown): string => {
    switch (code) {
        case 'item_timeout_detected':
            return attemptLabel(details) ?? tt('timelineTimeout');
        case 'item_recovery_opened':
            return attemptLabel(details) ?? tt('timelineRecovery');
        case 'item_retry_scheduled':
        case 'item_retry_attempt_started':
            return attemptLabel(details) ?? tt('timelineRetry');
        case 'item_recovery_attached':
            return nextAttemptLabel(details) ?? tt('timelineRecovery');
        case 'item_recovery_succeeded':
            return tt('timelineRecovered');
        case 'item_recovery_exhausted':
            return tt('timelineError');
        case 'item_tool_retry_scheduled':
            return attemptLabel(details) ?? tt('timelineRetry');
        case 'item_tool_retry_resolved':
            return tt('timelineRetryCompleted');
        case 'item_tool_retry_exhausted':
            return tt('timelineRetriesExhausted');
        case 'turn_blocked_resumable':
            return tt('timelineRecovery');
        case 'turn_tool_loop_budget_exceeded':
            return systemLevelLabel(level);
        case 'turn_permission_audit':
            return tt('timelinePermissions');
        case 'turn_failed':
            return systemLevelLabel(level);
        default:
            return systemLevelLabel(level);
    }
};

const attemptLabel = (details: unknown): string | null => {
    const attempt = readNumber(asRecord(details), 'attempt_no');
    return attempt === null ? null : tt('timelineAttempt', { attempt });
};

const nextAttemptLabel = (details: unknown): string | null => {
    const attempt = readNumber(asRecord(details), 'next_attempt_no');
    return attempt === null ? null : tt('timelineAttempt', { attempt });
};

const systemLevelLabel = (level: string): string => {
    switch (level) {
        case 'warning':
            return tt('timelineWarning');
        case 'error':
            return tt('timelineError');
        default:
            return tt('timelineSystemEvent');
    }
};

const fileChangeOutput = (item: Extract<TurnItem, { type: 'fileChange' }>, deltaText: string) => {
    return truncateText(
        normalizeTerminalOutput(item.stdout || item.stderr || deltaText || ''),
        FILE_CHANGE_OUTPUT_LIMIT,
    );
};

const toolCallDetails = (
    item: Extract<TurnItem, { type: 'webSearch' | 'webFetch' | 'download' | 'dynamicToolCall' }>,
    fallbackDetail: string,
) => {
    switch (item.type) {
        case 'webSearch': {
            const query =
                item.query ||
                readString(asRecord(item.arguments), 'query') ||
                readString(asRecord(item.arguments), 'q') ||
                fallbackDetail;
            const results = (item.results ?? []).map((result) => ({
                title: result.title,
                url: result.url,
                source: result.source,
                snippet: result.snippet,
            }));

            return {
                bytes: null,
                contentType: null,
                detail: query || tt('timelineWebSearch'),
                host: null,
                mcpDetails: null,
                mcpRawToolName: null,
                mcpServerId: null,
                mcpServerName: null,
                path: null,
                resultCount: item.resultCount ?? results.length,
                results,
                statusCode: null,
                url: null,
            };
        }
        case 'webFetch': {
            const url =
                item.finalUrl ||
                item.url ||
                readString(asRecord(item.arguments), 'url') ||
                fallbackDetail ||
                null;

            return {
                bytes: item.bytesReceived ?? null,
                contentType: item.contentType ?? null,
                detail:
                    item.title ||
                    item.resolvedMode ||
                    fallbackDetail ||
                    url ||
                    tt('timelineWebFetch'),
                host: url ? (hostFromUrl(url) ?? url) : tt('timelineNoUrlProvided'),
                mcpDetails: null,
                mcpRawToolName: null,
                mcpServerId: null,
                mcpServerName: null,
                path: null,
                resultCount: item.wordCount ?? null,
                results: [],
                statusCode: item.statusCode ?? null,
                url,
            };
        }
        case 'download': {
            const url =
                item.finalUrl ||
                item.url ||
                readString(asRecord(item.arguments), 'url') ||
                fallbackDetail ||
                null;

            return {
                bytes: item.bytesWritten ?? null,
                contentType: item.contentType ?? null,
                detail: item.path || fallbackDetail || url || tt('timelineDownload'),
                host: url ? (hostFromUrl(url) ?? url) : tt('timelineNoUrlProvided'),
                mcpDetails: null,
                mcpRawToolName: null,
                mcpServerId: null,
                mcpServerName: null,
                path: item.path ?? null,
                resultCount: null,
                results: [],
                statusCode: item.statusCode ?? null,
                url,
            };
        }
        case 'dynamicToolCall':
        default: {
            const mcpMetadata = mcpTimelineMetadata(item.display);
            const mcpDetails = mcpMetadata?.details ?? null;
            return {
                bytes: null,
                contentType: null,
                detail: fallbackDetail,
                host: null,
                mcpDetails,
                mcpRawToolName: mcpMetadata?.rawToolName ?? null,
                mcpServerId: mcpMetadata?.serverId ?? null,
                mcpServerName: mcpMetadata?.serverName ?? null,
                path: null,
                resultCount: null,
                results: [],
                statusCode: null,
                url: null,
            };
        }
    }
};

const prettyJsonForTimeline = (value: unknown): string | null => {
    if (value === null || value === undefined) {
        return null;
    }

    const text = JSON.stringify(value, null, 2);
    if (!text || text.trim() === '{}' || text.trim() === 'null') {
        return null;
    }

    return truncateText(text, 2_000);
};

const toolDisplayText = (display: unknown): string | null => {
    const record = asRecord(display);

    if (record.kind === 'shell') {
        return (
            readString(record, 'aggregated_output') ??
            readString(record, 'stdout') ??
            readString(record, 'stderr')
        );
    }

    if (record.kind === 'summary') {
        const lines: string[] = [];
        const title = readString(record, 'title');
        if (title?.trim()) {
            lines.push(title);
        }

        const summaryLines = record.lines;
        if (Array.isArray(summaryLines)) {
            lines.push(
                ...summaryLines.filter(
                    (line): line is string => typeof line === 'string' && !!line.trim(),
                ),
            );
        }

        return lines.length > 0 ? truncateText(lines.join('\n'), 4_000) : null;
    }

    if (record.kind === 'progress') {
        return readString(record, 'stage');
    }

    return null;
};

const dynamicToolResultText = (display: unknown): string | null => {
    const text = toolDisplayText(display);
    return text ? truncateText(text, DYNAMIC_TOOL_RESULT_LIMIT) : null;
};

type McpTimelineMetadata = {
    serverId: string | null;
    serverName: string;
    rawToolName: string;
    details: string;
};

const mcpTimelineMetadata = (display: unknown): McpTimelineMetadata | null => {
    const metadata = metadataRecordFromDisplay(display);
    if (!metadata) {
        return null;
    }

    const sourceIsMcp = metadataString(metadata.source) === 'mcp';
    const mcp = metadataObject(metadata.mcp);
    if (!mcp || (!sourceIsMcp && Object.keys(mcp).length === 0)) {
        return null;
    }

    const serverName = pickMetadataString(mcp, ['server_name', 'serverName']);
    const rawToolName = pickMetadataString(mcp, ['raw_tool_name', 'rawToolName']);
    if (!serverName || !rawToolName) {
        return null;
    }

    const catalogVersion = pickMetadataString(mcp, ['catalog_version', 'catalogVersion']);
    const snapshotVersion = pickMetadataNumber(mcp, ['snapshot_version', 'snapshotVersion']);
    const runtimeState = pickMetadataString(mcp, ['runtime_state', 'runtimeState']);
    const durationMs =
        pickMetadataNumber(mcp, ['duration_ms', 'durationMs']) ??
        pickMetadataNumber(metadata, ['duration_ms', 'durationMs']);
    const resultTruncated =
        pickMetadataBoolean(mcp, ['result_truncated', 'resultTruncated']) ??
        pickMetadataBoolean(metadata, ['truncated']);

    const details = [
        tt('timelineServerDetail', { value: serverName }),
        tt('timelineToolDetail', { value: rawToolName }),
        catalogVersion ? tt('timelineCatalogDetail', { value: catalogVersion }) : null,
        snapshotVersion === null ? null : tt('timelineSnapshotDetail', { value: snapshotVersion }),
        runtimeState ? tt('timelineRuntimeDetail', { value: runtimeState }) : null,
        durationMs === null ? null : tt('timelineDurationDetail', { value: durationMs }),
        resultTruncated === true ? tt('timelineResultTruncated') : null,
    ]
        .filter((line): line is string => !!line)
        .join('\n');

    return {
        serverId: pickMetadataString(mcp, ['server_id', 'serverId']),
        serverName,
        rawToolName,
        details,
    };
};

const metadataRecordFromDisplay = (display: unknown): Record<string, unknown> | null => {
    const record = asRecord(display);
    if (record.kind !== 'summary' && record.kind !== 'progress') {
        return null;
    }

    return asOptionalRecord(record.metadata);
};

const pickMetadataString = (record: Record<string, unknown>, keys: string[]): string | null => {
    for (const key of keys) {
        const value = metadataString(record[key]);
        if (value) {
            return value;
        }
    }

    return null;
};

const pickMetadataNumber = (record: Record<string, unknown>, keys: string[]): number | null => {
    for (const key of keys) {
        const value = metadataNumber(record[key]);
        if (value !== null) {
            return value;
        }
    }

    return null;
};

const pickMetadataBoolean = (record: Record<string, unknown>, keys: string[]): boolean | null => {
    for (const key of keys) {
        const value = metadataBoolean(record[key]);
        if (value !== null) {
            return value;
        }
    }

    return null;
};

const metadataString = (value: unknown): string | null => {
    const record = asRecord(value);
    return record.kind === 'string' && typeof record.value === 'string' ? record.value : null;
};

const metadataNumber = (value: unknown): number | null => {
    const record = asRecord(value);
    if (record.kind !== 'number' || typeof record.value !== 'string') {
        return null;
    }

    const parsed = Number(record.value);
    return Number.isFinite(parsed) ? parsed : null;
};

const metadataBoolean = (value: unknown): boolean | null => {
    const record = asRecord(value);
    return record.kind === 'bool' && typeof record.value === 'boolean' ? record.value : null;
};

const metadataObject = (value: unknown): Record<string, unknown> | null => {
    const record = asRecord(value);
    return record.kind === 'object' ? asOptionalRecord(record.fields) : null;
};

const commandShellDetails = (item: Extract<TurnItem, { type: 'commandExecution' }>) => {
    const display = shellRecord(item.display);
    const storage = shellRecord(item.storage);
    const source = display ?? storage;
    const output =
        readString(source, 'aggregated_output') ??
        readString(source, 'stdout') ??
        readString(source, 'stderr') ??
        '';

    return {
        durationMs: readNumber(source, 'duration_ms'),
        exitCode: readNumber(source, 'exit_code'),
        output: truncateTerminalOutput(normalizeTerminalOutput(output)),
        timedOut: readBoolean(source, 'timed_out'),
        truncated: readBoolean(source, 'truncated'),
    };
};

const commandTerminalText = (command: string, output: string): string => {
    const commandLine = command.trim() ? `$ ${command.trim()}` : '';
    const body = truncateTerminalOutput(normalizeTerminalOutput(output));

    return [commandLine, body].filter(Boolean).join('\n');
};

const shellRecord = (value: unknown): Record<string, unknown> | null => {
    const record = asRecord(value);
    return record.kind === 'shell' ? record : null;
};

const asRecord = (value: unknown): Record<string, unknown> => {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
};

const asOptionalRecord = (value: unknown): Record<string, unknown> | null => {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
};

const readString = (record: Record<string, unknown> | null, key: string): string | null => {
    const value = record?.[key];
    return typeof value === 'string' ? value : null;
};

const readNumber = (record: Record<string, unknown> | null, key: string): number | null => {
    const value = record?.[key];
    return typeof value === 'number' ? value : null;
};

const readBoolean = (record: Record<string, unknown> | null, key: string): boolean | null => {
    const value = record?.[key];
    return typeof value === 'boolean' ? value : null;
};

const normalizeTerminalOutput = (text: string): string => {
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\t/g, '    ');
};

const truncateTerminalOutput = (text: string): string => {
    const limit = 24_000;
    if (text.length <= limit) {
        return text;
    }

    return `${text.slice(0, limit)}\n... [truncated]`;
};

const truncateText = (text: string, limit: number): string => {
    if (text.length <= limit) {
        return text;
    }

    return `${text.slice(0, limit)}\n... [truncated]`;
};

const hostFromUrl = (value: string): string | null => {
    return parseHostFromUrl(value) ?? parseHostFromUrl(`https://${value}`);
};

const parseHostFromUrl = (value: string): string | null => {
    try {
        return new URL(value).host || null;
    } catch {
        return null;
    }
};

import type {
    ItemView,
    TimelineEntryStatus,
    TurnItem,
} from '@/client/generated/client_active_thread_snapshot';
import type {
    TimelineRowSnapshot,
    TimelineItemPresentation,
    TimelineToolContent,
    SystemEventLabel,
    TimelineTextPreview,
    TimelineAttachment,
    TimelineCapabilityRejection as CapabilityRejection,
} from '@/client/generated/timeline_snapshot';
import i18n from '@/locale/i18n';
import type { TimelineCapabilityRejection, TimelineRow, TimelineUserAttachment } from './timeline';

type TimelineItemStatus =
    'pending' | 'streaming' | 'completed' | 'failed' | 'cancelled' | 'unknown';
const tt = (key: string, options?: Record<string, unknown>): string =>
    String(i18n.t(`threads:${key}`, options));

export const localizeTimelineRow = (snapshot: TimelineRowSnapshot): TimelineRow => {
    const value = snapshot.value;
    const meta = {
        key: snapshot.id,
        presentationRevision: snapshot.revision,
        semanticWorkItem: Boolean(
            snapshot.item && snapshot.semantic_id && 'TurnWorkItem' in snapshot.semantic_id,
        ),
    };
    if ('PendingRequest' in value) {
        const pending = value.PendingRequest;
        return {
            ...meta,
            type: 'pending-request',
            turnId: pending.request.turn_id ?? null,
            author: pending.author,
            entry: {
                thread_id: pending.request.thread_id ?? null,
                turn_id: pending.request.turn_id ?? null,
                author: pending.author,
                request: pending.request,
            },
        };
    }
    const row = value.Timeline;
    if (snapshot.item) {
        const localized = localizeItem(snapshot.item, snapshot.content!);
        if ('UserMessage' in row.kind && localized.type === 'user-message') {
            const presentation = row.kind.UserMessage.presentation;
            return {
                ...localized,
                ...meta,
                author: row.author ?? null,
                startedAtUnixMs: snapshot.item.started_at_unix_ms ?? null,
                mode: presentation.mode,
                reply: presentation.reply ?? null,
                replyState: presentation.reply_state ?? null,
                mentions: presentation.mentions ?? [],
                revision: presentation.revision,
                edited: presentation.edited,
                deleted: presentation.deleted,
                attachments: localizeAttachments(snapshot.content!.attachments),
            };
        }
        return {
            ...localized,
            ...meta,
            author: row.author ?? null,
            startedAtUnixMs: snapshot.item.started_at_unix_ms ?? null,
        };
    }
    if ('TurnWorkToggle' in row.kind) {
        const group = row.kind.TurnWorkToggle;
        return {
            ...meta,
            type: 'work-group',
            turnId: snapshot.turn_id ?? '',
            anchorItemId: snapshot.anchor_item_id ?? '',
            anchorEntryId: group.anchor_entry_id,
            title: tt('timelineWorked'),
            elapsedMs: group.elapsed_ms ?? null,
            elapsedLabel: group.elapsed_ms == null ? null : formatElapsedMs(group.elapsed_ms),
            expanded: group.is_open,
            author: row.author ?? null,
        };
    }
    if ('CoalescedTools' in row.kind) {
        const group = row.kind.CoalescedTools;
        const kind =
            group.kind === 'CompletedTaskTools' ? 'completedTaskTools' : 'repeatedTaskWait';
        return {
            ...meta,
            type: 'tool-group',
            turnId: snapshot.turn_id ?? '',
            kind,
            title: tt(
                kind === 'completedTaskTools'
                    ? 'timelineCompletedToolCalls'
                    : 'timelineRepeatedTaskWaitCalls',
                { count: group.count },
            ),
            count: group.count,
            status: 'completed',
            expanded: group.is_open,
            items: [],
            author: row.author ?? null,
        };
    }
    if ('RunningTurn' in row.kind) {
        const running = row.kind.RunningTurn;
        return {
            ...meta,
            type: 'running',
            turnId: running.turn_id,
            startedAtUnixMs: running.started_at_unix_ms ?? null,
            elapsedLabel: null,
            state: running.state ?? null,
            message: running.message ?? null,
            author: row.author ?? null,
            securitySummary: running.security_summary ?? null,
        };
    }
    return {
        ...meta,
        type: 'unknown',
        itemId: '',
        turnId: snapshot.turn_id ?? '',
        label: 'unknown',
    };
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

const formatElapsed = (
    content: TimelineItemPresentation,
    started: number | null | undefined,
): string | null =>
    content.streaming && started != null
        ? formatElapsedMs(Math.max(0, Date.now() - started))
        : null;

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

const localizeItem = (item: ItemView, content: TimelineItemPresentation): TimelineRow => {
    const text = content.text;
    const status = itemStatus(item.status);

    switch (content.kind) {
        case 'UserMessage': {
            return {
                type: 'user-message',
                key: rowKey('user-message', item.id),
                itemId: item.id,
                turnId: item.turn_id,
                text,
                attachments: localizeAttachments(content.attachments),
                timestampLabel: formatTimestamp(content.timestamp),
                lastEditedTimestampLabel: formatTimestamp(content.edited_timestamp),
                mode: null,
                author: null,
                reply: null,
                replyState: null,
                mentions: [],
                revision: 0,
                edited: false,
                deleted: false,
            };
        }
        case 'AgentMessage': {
            const turnItem = item.item as Extract<TurnItem, { type: 'agentMessage' }>;
            return {
                type: 'assistant-message',
                key: rowKey('assistant-message', item.id),
                itemId: item.id,
                turnId: item.turn_id,
                text,
                markdown: content.markdown_presentation ?? null,
                phase: turnItem.phase ?? 'final_answer',
                streaming: content.streaming,
                taskTimeline: content.task_timeline,
                elapsedLabel: formatElapsed(content, item.started_at_unix_ms),
                timestampLabel: formatTimestamp(content.timestamp),
            };
        }
        case 'Reasoning': {
            return {
                type: 'reasoning',
                key: rowKey('reasoning', item.id),
                itemId: item.id,
                turnId: item.turn_id,
                text,
                markdown: content.markdown_presentation ?? null,
                collapsed: content.collapsed,
                streaming: content.streaming,
                elapsedLabel: formatElapsed(content, item.started_at_unix_ms),
            };
        }
        case 'SystemEvent': {
            const turnItem = item.item as Extract<TurnItem, { type: 'systemEvent' }>;
            return {
                type: 'system-event',
                key: rowKey('system-event', item.id),
                itemId: item.id,
                turnId: item.turn_id,
                level: turnItem.level,
                message: text,
                code: turnItem.code ?? null,
                details: turnItem.details ?? null,
                label: localizeSystemLabel(content.system_label!, turnItem.level),
                capabilityRejections: content.capability_rejections.map(
                    localizeCapabilityRejection,
                ),
            };
        }
        case 'Task': {
            const turnItem = item.item as Extract<TurnItem, { type: 'task' }>;
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
                elapsedLabel: formatElapsed(content, item.started_at_unix_ms),
                progressPreview:
                    typeof turnItem.progressPreview === 'string' ? turnItem.progressPreview : null,
                resultPreview: turnItem.resultPreview ?? null,
                errorPreview: turnItem.errorPreview ?? null,
            };
        }
        case 'CommandExecution': {
            const turnItem = item.item as Extract<TurnItem, { type: 'commandExecution' }>;
            const shell = content.command!;
            const command = shell.command;
            const outputPreview = previewText(shell.output);
            return {
                type: 'command-execution',
                key: rowKey('command-execution', item.id),
                itemId: item.id,
                turnId: item.turn_id,
                status,
                command,
                cwd: turnItem.cwd ?? null,
                durationMs: shell.duration_ms ?? null,
                exitCode: shell.exit_code ?? null,
                outputPreview,
                terminalText: [
                    command.trim() ? `$ ${command.trim()}` : '',
                    previewText(shell.terminal_output),
                ]
                    .filter(Boolean)
                    .join('\n'),
                timedOut: shell.timed_out ?? null,
                truncated: shell.truncated ?? null,
                streaming: content.streaming,
                elapsedLabel: formatElapsed(content, item.started_at_unix_ms),
            };
        }
        case 'FileChange': {
            const turnItem = item.item as Extract<TurnItem, { type: 'fileChange' }>;
            const fileOutput = content.file_output ? previewText(content.file_output) : '';
            const filePaths = turnItem.changedFiles ?? [];
            const final = localizedFinalStatus(content, 'fileChange');
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
                elapsedLabel: formatElapsed(content, item.started_at_unix_ms),
                exitCode: turnItem.exitCode ?? null,
                output: fileOutput,
            };
        }
        case 'WebSearch':
        case 'WebFetch':
        case 'Download':
        case 'DynamicToolCall': {
            const turnItem = item.item as Extract<
                TurnItem,
                { type: 'webSearch' | 'webFetch' | 'download' | 'dynamicToolCall' }
            >;
            const toolDetails = localizedToolDetails(content.tool!, turnItem);
            const final = localizedFinalStatus(content, turnItem.type);
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
                elapsedLabel: formatElapsed(content, item.started_at_unix_ms),
                argumentsText: content.tool?.arguments_text
                    ? previewText(content.tool.arguments_text)
                    : null,
                resultText: content.tool?.result_text
                    ? previewText(content.tool.result_text)
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
                taskReview: content.tool?.task_review ?? null,
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

const localizeAttachments = (attachments: TimelineAttachment[]): TimelineUserAttachment[] =>
    attachments.map((attachment) => ({
        id: attachment.id,
        kind: attachment.kind,
        artifact: attachment.artifact ?? null,
        label:
            attachment.parent_title == null
                ? attachment.title
                : `${attachment.parent_title} / ${attachment.title}`,
    }));

const localizeCapabilityRejection = (
    rejection: CapabilityRejection,
): TimelineCapabilityRejection => {
    const kind = tt(
        rejection.kind === 'Skill'
            ? 'timelineSkill'
            : rejection.kind === 'McpServer'
              ? 'timelineMcpServer'
              : rejection.kind === 'McpTool'
                ? 'timelineMcpTool'
                : 'timelineCapability',
    );
    const name =
        rejection.name ??
        (rejection.kind === 'McpServer' ? tt('timelineMcpServer') : tt('timelineCapability'));
    return {
        id: rejection.id ?? `capability:${name}`,
        label: rejection.label || name || tt('timelineCapability'),
        kind,
        message: rejection.message,
    };
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

const localizeSystemLabel = (label: SystemEventLabel, level: string): string => {
    if (typeof label === 'object') {
        if ('Attempt' in label) return tt('timelineAttempt', { attempt: label.Attempt.attempt });
        return systemLevelLabel(level);
    }
    const keys: Partial<Record<SystemEventLabel & string, string>> = {
        Timeout: 'timelineTimeout',
        Recovery: 'timelineRecovery',
        Retry: 'timelineRetry',
        Recovered: 'timelineRecovered',
        Error: 'timelineError',
        RetryResolved: 'timelineRetryCompleted',
        RetriesExhausted: 'timelineRetriesExhausted',
        Permissions: 'timelinePermissions',
    };
    return keys[label] ? tt(keys[label]!) : systemLevelLabel(level);
};
const systemLevelLabel = (level: string): string =>
    tt(
        level === 'warning'
            ? 'timelineWarning'
            : level === 'error'
              ? 'timelineError'
              : 'timelineSystemEvent',
    );
const localizedFinalStatus = (content: TimelineItemPresentation, type: string) => {
    const status = content.final_status!;
    const label =
        status.kind === 'Cancelled'
            ? tt('timelineCancelled')
            : status.kind === 'Running'
              ? type === 'fileChange'
                  ? tt('timelineApplyingChanges')
                  : toolRunningLabel(type)
              : status.kind === 'Completed'
                ? type === 'fileChange'
                    ? tt('timelineFilesChanged')
                    : toolCompletedLabel(type)
                : type === 'fileChange'
                  ? tt('timelineChangesNotApplied')
                  : toolFailedLabel(type);
    return { label, successful: status.successful };
};
const localizedToolDetails = (
    content: TimelineToolContent,
    item: Extract<TurnItem, { type: 'webSearch' | 'webFetch' | 'download' | 'dynamicToolCall' }>,
) => {
    const mcp = content.mcp;
    const mcpDetails = mcp
        ? [
              tt('timelineServerDetail', { value: mcp.server_name }),
              tt('timelineToolDetail', { value: mcp.raw_tool_name }),
              mcp.catalog_version
                  ? tt('timelineCatalogDetail', { value: mcp.catalog_version })
                  : null,
              mcp.snapshot_version == null
                  ? null
                  : tt('timelineSnapshotDetail', { value: mcp.snapshot_version }),
              mcp.runtime_state ? tt('timelineRuntimeDetail', { value: mcp.runtime_state }) : null,
              mcp.duration_ms == null
                  ? null
                  : tt('timelineDurationDetail', { value: mcp.duration_ms }),
              mcp.result_truncated === true ? tt('timelineResultTruncated') : null,
          ]
              .filter(Boolean)
              .join('\n')
        : null;
    return {
        detail:
            content.detail ||
            (item.type === 'webSearch'
                ? tt('timelineWebSearch')
                : item.type === 'webFetch'
                  ? tt('timelineWebFetch')
                  : item.type === 'download'
                    ? tt('timelineDownload')
                    : ''),
        url: content.url ?? null,
        host:
            content.host ??
            (item.type === 'webFetch' || item.type === 'download'
                ? tt('timelineNoUrlProvided')
                : null),
        bytes: content.bytes ?? null,
        resultCount: content.result_count ?? null,
        results: item.type === 'webSearch' ? (item.results ?? []) : [],
        statusCode:
            item.type === 'webFetch' || item.type === 'download' ? (item.statusCode ?? null) : null,
        path: item.type === 'download' ? (item.path ?? null) : null,
        contentType:
            item.type === 'webFetch' || item.type === 'download'
                ? (item.contentType ?? null)
                : null,
        mcpDetails,
        mcpRawToolName: mcp?.raw_tool_name ?? null,
        mcpServerId: mcp?.server_id ?? null,
        mcpServerName: mcp?.server_name ?? null,
    };
};
const previewText = (preview: TimelineTextPreview): string =>
    preview.text + (preview.truncated ? '\n... [truncated]' : '');

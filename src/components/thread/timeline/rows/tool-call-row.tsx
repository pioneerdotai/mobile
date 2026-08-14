import {
    Check,
    ChevronDown,
    ChevronUp,
    Download,
    Globe2,
    Search,
    Terminal,
    TriangleAlert,
} from 'lucide-react-native';
import { Linking } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { TimelineRow } from '@/services/threads/conversation/timeline';
import type { TaskWaitReviewDisplayItem } from '@/client/generated/task_wait_review_display_item';
import { pioneerClient } from '@/client';
import { McpIcon } from '@/components/icons/mcp-icon';
import { HStack } from '@/components/primitives/hstack';
import { Input } from '@/components/primitives/input';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import Spinner from '@/components/feedback/spinner';
import { canManageTaskReviewItem, taskReviewUserControlsAllowed } from '@/services/tasks/review';
import {
    invalidateTimelineQueriesForThread,
    invalidateTurnWorkQueries,
} from '@/services/threads/timeline-query';

import { BodyText } from './status';
import { TIMELINE_TECHNICAL_ROW_VERTICAL_PADDING_UNITS } from '../timeline-grouping';

type ToolCallRowProps = {
    row: Extract<TimelineRow, { type: 'tool-call' }>;
    expanded: boolean;
    canReviewTasks: boolean;
    canCancelTasks: boolean;
    threadId: string;
    mcpServerIdByName: Readonly<Record<string, string>>;
    onOpenMcpServer?: (serverId: string) => void;
    onToggle: () => void;
};

export const ToolCallRow = ({
    row,
    expanded,
    canReviewTasks,
    canCancelTasks,
    threadId,
    mcpServerIdByName,
    onOpenMcpServer,
    onToggle,
}: ToolCallRowProps) => {
    const { theme } = useUnistyles();
    const { t } = useTranslation('threads');

    const iconColor = theme.colors.typography;
    const isRunning = isRunningStatus(row.status);
    const mcpServerIdToOpen =
        row.mcpServerId ??
        (row.mcpServerName ? (mcpServerIdByName[row.mcpServerName] ?? null) : null);
    const canOpenMcpServer =
        row.toolKind === 'dynamicToolCall' && !!mcpServerIdToOpen && !!onOpenMcpServer;
    const StatusIcon = row.successful ? Check : TriangleAlert;

    const openMcpServer = () => {
        if (mcpServerIdToOpen) {
            onOpenMcpServer?.(mcpServerIdToOpen);
        }
    };

    const iconSize = theme.space(4);
    const smallIconSize = theme.space(3.5);
    const mcpButtonIconSize = theme.space(3.75);

    return (
        <VStack style={styles.container}>
            <Pressable
                accessibilityRole="button"
                onPress={onToggle}
                style={({ pressed }) => [
                    styles.header,
                    isRunning && styles.activeHeader,
                    pressed && styles.pressed,
                ]}
            >
                <ToolTitle
                    row={row}
                    iconColor={iconColor}
                    iconSize={iconSize}
                    running={isRunning}
                />
                <HStack style={styles.meta}>
                    {isRunning ? (
                        <Text numberOfLines={1} style={styles.metaText}>
                            {row.finalStatus}
                        </Text>
                    ) : row.toolKind === 'webSearch' ? (
                        <Text numberOfLines={1} style={styles.metaText}>
                            {t('timelineResults', {
                                count: row.resultCount ?? row.results.length,
                            })}
                        </Text>
                    ) : row.toolKind === 'dynamicToolCall' ? (
                        <>
                            <StatusIcon size={smallIconSize} color={iconColor} />
                            <Text numberOfLines={1} style={styles.metaText}>
                                {row.finalStatus}
                            </Text>
                        </>
                    ) : null}
                    {!!row.elapsedLabel && (
                        <Text numberOfLines={1} style={styles.metaText}>
                            {row.elapsedLabel}
                        </Text>
                    )}
                    {expanded ? (
                        <ChevronUp size={iconSize} color={iconColor} />
                    ) : (
                        <ChevronDown size={iconSize} color={iconColor} />
                    )}
                </HStack>
            </Pressable>
            {expanded && (
                <VStack style={styles.details}>
                    {(row.toolKind === 'webFetch' || row.toolKind === 'download') && row.url ? (
                        <Pressable onPress={() => void Linking.openURL(row.url!)}>
                            <Text numberOfLines={2} style={styles.linkText}>
                                {row.url}
                            </Text>
                        </Pressable>
                    ) : row.toolKind === 'webFetch' || row.toolKind === 'download' ? (
                        <BodyText>{t('timelineNoUrlProvided')}</BodyText>
                    ) : null}
                    {(row.toolKind === 'webFetch' || row.toolKind === 'download') && (
                        <HStack style={styles.statusRow}>
                            {!isRunning && <StatusIcon size={smallIconSize} color={iconColor} />}
                            <Text style={styles.metaText}>{row.finalStatus}</Text>
                        </HStack>
                    )}
                    {row.toolKind === 'download' && row.bytes !== null && (
                        <Text style={styles.metaText}>
                            {t('timelineSize', { size: formatBytes(row.bytes) })}
                        </Text>
                    )}
                    {row.mcpDetails ? <DetailBlock title="MCP" text={row.mcpDetails} /> : null}
                    {row.argumentsText ? (
                        <DetailBlock title={t('timelineArguments')} text={row.argumentsText} mono />
                    ) : null}
                    {row.resultText ? (
                        <DetailBlock title={t('timelineResult')} text={row.resultText} />
                    ) : null}
                    {row.taskReview ? (
                        <TaskReviewPanel
                            review={row.taskReview}
                            threadId={threadId}
                            turnId={row.turnId}
                            canReviewTasks={canReviewTasks}
                            canCancelTasks={canCancelTasks}
                        />
                    ) : null}
                    {row.toolKind === 'dynamicToolCall' &&
                        !row.mcpDetails &&
                        !row.argumentsText &&
                        !row.resultText && <BodyText>{t('timelineNoDetails')}</BodyText>}
                    {canOpenMcpServer ? (
                        <Pressable
                            accessibilityRole="button"
                            onPress={openMcpServer}
                            style={({ pressed }) => [styles.mcpButton, pressed && styles.pressed]}
                        >
                            <McpIcon
                                size={mcpButtonIconSize}
                                color={theme.colors.text}
                                strokeWidth={2.3}
                            />
                            <Text style={styles.mcpButtonText}>{t('timelineOpenMcpServer')}</Text>
                        </Pressable>
                    ) : null}
                    {row.toolKind === 'webSearch' && row.results.length === 0 && (
                        <BodyText>{t('timelineNoSearchResults')}</BodyText>
                    )}
                    {row.toolKind === 'webSearch' && row.results.length > 0 && (
                        <VStack style={styles.resultList}>
                            {row.results.map((result, index) => (
                                <Pressable
                                    key={`${result.url}:${result.title}:${index}`}
                                    onPress={() => void Linking.openURL(result.url)}
                                    style={({ pressed }) => [
                                        styles.resultRow,
                                        pressed && styles.pressed,
                                    ]}
                                >
                                    <Text numberOfLines={1} style={styles.resultTitle}>
                                        {result.title}
                                    </Text>
                                    <Text numberOfLines={1} style={styles.resultSource}>
                                        {resultHostLabel(result.url)}
                                    </Text>
                                </Pressable>
                            ))}
                        </VStack>
                    )}
                </VStack>
            )}
        </VStack>
    );
};

const TaskReviewPanel = ({
    review,
    threadId,
    turnId,
    canReviewTasks,
    canCancelTasks,
}: {
    review: NonNullable<Extract<TimelineRow, { type: 'tool-call' }>['taskReview']>;
    threadId: string;
    turnId: string;
    canReviewTasks: boolean;
    canCancelTasks: boolean;
}) => {
    const { t } = useTranslation('threads');

    return (
        <VStack style={styles.taskReviewPanel}>
            <Text style={styles.taskReviewTitle}>
                {t('timelineTaskReviewRequired', {
                    count: Math.max(review.review_required_count, review.items.length),
                })}
            </Text>
            {review.items.map((item) => (
                <TaskReviewItem
                    key={item.candidate_id}
                    item={item}
                    threadId={threadId}
                    turnId={turnId}
                    canManage={
                        taskReviewUserControlsAllowed(item) &&
                        canManageTaskReviewItem({
                            item,
                            canReviewTasks,
                            canCancelTasks,
                        })
                    }
                    canReview={canReviewTasks}
                    canCancel={canCancelTasks}
                />
            ))}
        </VStack>
    );
};

const TaskReviewItem = ({
    item,
    threadId,
    turnId,
    canManage,
    canReview,
    canCancel,
}: {
    item: TaskWaitReviewDisplayItem;
    threadId: string;
    turnId: string;
    canManage: boolean;
    canReview: boolean;
    canCancel: boolean;
}) => {
    const { t } = useTranslation('threads');
    const queryClient = useQueryClient();
    const [feedback, setFeedback] = useState('');
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const runId = item.run_id?.trim() ?? '';
    const actions = new Set(item.allowed_actions);
    const canAccept = canManage && canReview && actions.has('task_accept') && !!runId;
    const canRevise =
        canManage &&
        canReview &&
        actions.has('task_revise') &&
        !!runId &&
        feedback.trim().length > 0;
    const canCancelAction = canManage && canCancel && actions.has('task_cancel');

    const refresh = async () => {
        await Promise.all([
            invalidateTimelineQueriesForThread(queryClient, threadId),
            invalidateTurnWorkQueries(queryClient, threadId, turnId),
        ]);
    };
    const perform = async (action: 'accept' | 'revise' | 'cancel') => {
        setPendingAction(action);
        setError(null);
        try {
            if (action === 'accept') {
                await pioneerClient.taskAccept({
                    taskId: item.task_id,
                    runId,
                    candidateId: item.candidate_id,
                });
            } else if (action === 'revise') {
                await pioneerClient.taskRevise({
                    taskId: item.task_id,
                    runId,
                    candidateId: item.candidate_id,
                    feedback: feedback.trim(),
                    additionalInstructions: [],
                });
            } else {
                await pioneerClient.taskCancel({
                    taskId: item.task_id,
                    scope: 'attached_subtree',
                });
            }
            await refresh();
        } catch (actionError) {
            setError(
                actionError instanceof Error
                    ? actionError.message
                    : t('timelineTaskReviewActionFailed'),
            );
        } finally {
            setPendingAction(null);
        }
    };

    return (
        <VStack style={styles.taskReviewItem}>
            <Text style={styles.taskReviewItemTitle}>{item.title || t('timelineTask')}</Text>
            {item.summary ? (
                <DetailBlock title={t('timelineTaskReviewSummary')} text={item.summary} />
            ) : null}
            {item.result_preview ? (
                <DetailBlock title={t('timelineTaskReviewResult')} text={item.result_preview} />
            ) : null}
            {item.extraction_error_preview ? (
                <DetailBlock title={t('timelineError')} text={item.extraction_error_preview} />
            ) : null}
            {item.diagnostics.length > 0 ? (
                <DetailBlock
                    title={t('timelineTaskReviewDiagnostics')}
                    text={item.diagnostics.join('\n')}
                />
            ) : null}
            {item.remaining_revision_rounds !== null &&
            item.remaining_revision_rounds !== undefined ? (
                <Text style={styles.metaText}>
                    {t('timelineTaskReviewRevisionRounds', {
                        count: item.remaining_revision_rounds,
                    })}
                </Text>
            ) : null}
            {canManage && canReview && actions.has('task_revise') ? (
                <Input
                    value={feedback}
                    editable={pendingAction === null}
                    multiline
                    placeholder={t('timelineTaskReviewFeedbackPlaceholder')}
                    onChangeText={setFeedback}
                    style={styles.taskReviewInput}
                />
            ) : null}
            {error ? <Text style={styles.taskReviewError}>{error}</Text> : null}
            {canManage ? (
                <HStack style={styles.taskReviewActions}>
                    {canReview && actions.has('task_accept') ? (
                        <TaskReviewButton
                            label={t('timelineTaskReviewAccept')}
                            disabled={!canAccept || pendingAction !== null}
                            primary
                            onPress={() => void perform('accept')}
                        />
                    ) : null}
                    {canReview && actions.has('task_revise') ? (
                        <TaskReviewButton
                            label={t('timelineTaskReviewRevise')}
                            disabled={!canRevise || pendingAction !== null}
                            onPress={() => void perform('revise')}
                        />
                    ) : null}
                    {canCancel && actions.has('task_cancel') ? (
                        <TaskReviewButton
                            label={t('timelineTaskReviewCancel')}
                            disabled={!canCancelAction || pendingAction !== null}
                            danger
                            onPress={() => void perform('cancel')}
                        />
                    ) : null}
                </HStack>
            ) : null}
        </VStack>
    );
};

const TaskReviewButton = ({
    label,
    disabled,
    primary = false,
    danger = false,
    onPress,
}: {
    label: string;
    disabled: boolean;
    primary?: boolean;
    danger?: boolean;
    onPress: () => void;
}) => (
    <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
            styles.taskReviewButton,
            primary && styles.taskReviewButtonPrimary,
            danger && styles.taskReviewButtonDanger,
            disabled && styles.taskReviewButtonDisabled,
            pressed && !disabled && styles.pressed,
        ]}
    >
        <Text style={[styles.taskReviewButtonText, primary && styles.taskReviewButtonPrimaryText]}>
            {label}
        </Text>
    </Pressable>
);

const ToolTitle = ({
    row,
    iconColor,
    iconSize,
    running,
}: {
    row: Extract<TimelineRow, { type: 'tool-call' }>;
    iconColor: string;
    iconSize: number;
    running: boolean;
}) => {
    const { t } = useTranslation('threads');

    return (
        <HStack style={styles.titleWrap}>
            {running ? (
                <Spinner size={iconSize} color={iconColor} />
            ) : (
                renderToolIcon(row.toolKind, iconColor, iconSize)
            )}
            <Text numberOfLines={1} style={styles.title}>
                {titleForTool(row, t)}
            </Text>
        </HStack>
    );
};

const DetailBlock = ({
    title,
    text,
    mono = false,
}: {
    title: string;
    text: string;
    mono?: boolean;
}) => {
    return (
        <VStack style={styles.detailBlock}>
            <Text style={styles.detailTitle}>{title}</Text>
            <Text selectable style={[styles.detailText, mono && styles.detailMono]}>
                {text}
            </Text>
        </VStack>
    );
};

const styles = StyleSheet.create((theme) => ({
    container: {
        width: '100%',
        maxWidth: '100%',
        paddingVertical: theme.space(TIMELINE_TECHNICAL_ROW_VERTICAL_PADDING_UNITS),
        gap: theme.space(2),
    },
    header: {
        minHeight: theme.space(9),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(2),
        opacity: 0.7,
    },
    activeHeader: {
        opacity: 1,
    },
    pressed: {
        opacity: 0.9,
    },
    titleWrap: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        gap: theme.space(2),
    },
    title: {
        flex: 1,
        minWidth: 0,
        color: theme.colors.text,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    meta: {
        maxWidth: '56%',
        alignItems: 'center',
        gap: theme.space(2),
    },
    details: {
        gap: theme.space(2),
    },
    statusRow: {
        alignItems: 'center',
        gap: theme.space(2),
    },
    linkText: {
        color: theme.colors.infoText,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        textDecorationLine: 'underline',
    },
    metaText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    detailBlock: {
        gap: theme.space(1.5),
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        paddingHorizontal: theme.space(2.5),
        paddingVertical: theme.space(2),
    },
    detailTitle: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.bold.fontWeight,
    },
    detailText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    detailMono: {
        fontFamily: 'Menlo',
    },
    resultList: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surface,
        overflow: 'hidden',
    },
    resultRow: {
        gap: theme.space(0.75),
        paddingHorizontal: theme.space(2.5),
        paddingVertical: theme.space(2),
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceMuted,
    },
    resultTitle: {
        color: theme.colors.text,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.bold.fontWeight,
    },
    resultSource: {
        color: theme.colors.infoText,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
    mcpButton: {
        alignSelf: 'flex-start',
        minHeight: theme.space(8.5),
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.space(2.5),
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space(1.75),
    },
    mcpButtonText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.sm.fontSize,
        fontWeight: theme.fontWeight.extrabold.fontWeight,
    },
    taskReviewPanel: {
        gap: theme.space(2),
        borderWidth: 1,
        borderColor: theme.colors.warningBorder,
        borderRadius: theme.radius.xl,
        backgroundColor: theme.colors.warningSurface,
        padding: theme.space(3),
    },
    taskReviewTitle: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.bold.fontWeight,
    },
    taskReviewItem: {
        gap: theme.space(2),
    },
    taskReviewItemTitle: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    taskReviewInput: {
        minHeight: theme.space(14),
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        paddingHorizontal: theme.space(3),
        paddingVertical: theme.space(2),
        textAlignVertical: 'top',
    },
    taskReviewActions: {
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: theme.space(1.5),
    },
    taskReviewButton: {
        minHeight: theme.space(8),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.space(3),
    },
    taskReviewButtonPrimary: {
        borderColor: theme.colors.foreground,
        backgroundColor: theme.colors.foreground,
    },
    taskReviewButtonDanger: {
        borderColor: theme.colors.dangerBorder,
        backgroundColor: theme.colors.dangerSurface,
    },
    taskReviewButtonDisabled: {
        opacity: 0.45,
    },
    taskReviewButtonText: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    taskReviewButtonPrimaryText: {
        color: theme.colors.background,
    },
    taskReviewError: {
        color: theme.colors.dangerText,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
}));

const renderToolIcon = (
    toolKind: Extract<TimelineRow, { type: 'tool-call' }>['toolKind'],
    color: string,
    size: number,
) => {
    switch (toolKind) {
        case 'webSearch':
            return <Search size={size} color={color} />;
        case 'webFetch':
            return <Globe2 size={size} color={color} />;
        case 'download':
            return <Download size={size} color={color} />;
        default:
            return <Terminal size={size} color={color} />;
    }
};

const titleForTool = (
    row: Extract<TimelineRow, { type: 'tool-call' }>,
    t: (key: string) => string,
) => {
    switch (row.toolKind) {
        case 'webSearch':
            return row.detail || t('timelineWebSearchTitle');
        case 'webFetch':
        case 'download':
            return row.host || row.title || t('timelineWebTitle');
        default:
            return row.title || t('timelineToolTitle');
    }
};

const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }

    if (unit === 0) {
        return `${bytes} ${units[unit]}`;
    }

    return value % 1 < 0.05
        ? `${value.toFixed(0)} ${units[unit]}`
        : `${value.toFixed(1)} ${units[unit]}`;
};

const isRunningStatus = (status: string) => {
    return (
        status === 'in_progress' ||
        status === 'running' ||
        status === 'streaming' ||
        status === 'pending'
    );
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

const resultHostLabel = (url: string) => {
    return hostFromUrl(url) ?? url;
};

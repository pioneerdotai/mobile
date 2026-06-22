import {
    forwardRef,
    useCallback,
    useEffect,
    useMemo,
    useState,
    type Ref,
    type ReactElement,
} from 'react';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Reanimated, {
    interpolate,
    useAnimatedStyle,
    type SharedValue,
} from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { KeyboardAwareLegendList } from '@legendapp/list/keyboard';
import type { LegendListRef } from '@legendapp/list/react-native';

import type { ClientActiveThreadSnapshot } from '@/client';
import { projectConversationToRows } from '@/services/threads/conversation/projector';
import type { TimelinePendingRequest, TimelineRow } from '@/services/threads/conversation/timeline';
import { CLIRuntimePendingRequestCard } from '@/components/thread/cli-runtime-pending-requests';
import { Box } from '@/components/primitives/box';
import { Text } from '@/components/primitives/text';
import Spinner from '@/components/feedback/spinner';

import {
    ArtifactRow,
    AssistantMessageRow,
    CommandExecutionRow,
    FileChangeRow,
    ReasoningRow,
    RunningRow,
    SystemEventRow,
    TaskAnchorRow,
    ToolCallRow,
    ToolGroupRow,
    UnknownRow,
    UserMessageRow,
    WorkGroupRow,
} from './rows';
import { VStack } from '@/components/primitives/vstack';

type ThreadTimelineProps = {
    conversation: ClientActiveThreadSnapshot;
    loading: boolean;
    closed: boolean;
    connected: boolean;
    emptyLabel: string;
    closedLabel: string;
    disconnectedLabel: string;
    loadingLabel: string;
    pendingRequests: TimelinePendingRequest[];
    contentTopInset?: number;
    contentBottomInset?: number;
    ListHeaderComponent?: ReactElement | null;
    keyboardOffset: number;
    contentInsetEndAdjustment: SharedValue<number>;
    mcpServerIdByName: Readonly<Record<string, string>>;
    onOpenArtifact?: (artifactId: string) => void;
    onOpenMcpServer?: (serverId: string) => void;
    onExpandedKeysChange: (keys: string[]) => void;
    onRefresh: () => Promise<void>;
};

const BOTTOM_FOLLOW_THRESHOLD_RATIO = 0.12;
const TIMELINE_DRAW_DISTANCE = 640;
const TIMELINE_ESTIMATED_ITEM_SIZE = 64;
const TIMELINE_CONTENT_BOTTOM_PADDING_UNITS = 6;
const TIMELINE_KEYBOARD_LIFT_BEHAVIOR = 'whenAtEnd';
const TIMELINE_ANCHOR_MAX_LINES = 2;

export const ThreadTimeline = forwardRef<LegendListRef, ThreadTimelineProps>((props, ref) => {
    return <ThreadTimelineContent {...props} timelineRef={ref} />;
});

ThreadTimeline.displayName = 'ThreadTimeline';

type ThreadTimelineContentProps = ThreadTimelineProps & {
    timelineRef: Ref<LegendListRef>;
};

const ThreadTimelineContent = ({
    conversation,
    loading,
    closed,
    connected,
    emptyLabel,
    closedLabel,
    disconnectedLabel,
    loadingLabel,
    pendingRequests,
    contentTopInset = 0,
    contentBottomInset = 0,
    ListHeaderComponent,
    keyboardOffset,
    contentInsetEndAdjustment,
    mcpServerIdByName,
    onOpenArtifact,
    onOpenMcpServer,
    onExpandedKeysChange,
    onRefresh,
    timelineRef,
}: ThreadTimelineContentProps) => {
    const { theme } = useUnistyles();
    const [refreshing, setRefreshing] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [timelineNowMs, setTimelineNowMs] = useState(() => Date.now());

    const expandedKeys = useMemo(
        () => Object.keys(expandedRows).filter((key) => expandedRows[key]),
        [expandedRows],
    );

    const hasLiveTimelineItems = useMemo(
        () => conversation.projection.items.some((item) => item.status === 'Running'),
        [conversation],
    );

    const rows = useMemo(
        () =>
            projectConversationToRows(conversation, {
                expandedKeys: expandedRows,
                nowMs: timelineNowMs,
                pendingRequests,
            }),
        [conversation, expandedRows, pendingRequests, timelineNowMs],
    );

    const rowCount = rows.length;
    const hasRunningTimelineRow = useMemo(() => rows.some((row) => row.type === 'running'), [rows]);
    const activeTurnId = useMemo(
        () => activeProjectionTurnId(conversation.projection.turns),
        [conversation.projection.turns],
    );

    const anchorIndex = useMemo(() => {
        const turnId = conversation.projection.in_flight_turn_id ?? activeTurnId;
        const hasActiveTurn =
            Boolean(turnId) ||
            Boolean(conversation.projection.pending_request_id) ||
            conversation.projection.composer_locked ||
            hasLiveTimelineItems ||
            hasRunningTimelineRow;

        if (!hasActiveTurn) {
            const latestUserMessageIndex = latestAnchorableUserMessageIndex(rows);

            return latestUserMessageIndex >= 0 ? latestUserMessageIndex : undefined;
        }

        if (turnId) {
            const userMessageIndex = rows.findIndex(
                (row) => row.type === 'user-message' && row.turnId === turnId,
            );

            if (userMessageIndex >= 0) {
                return userMessageIndex;
            }

            const turnIndex = rows.findIndex((row) => timelineRowTurnId(row) === turnId);

            return turnIndex >= 0 ? turnIndex : undefined;
        }

        const latestUserMessageIndex = latestAnchorableUserMessageIndex(rows);

        return latestUserMessageIndex >= 0 ? latestUserMessageIndex : undefined;
    }, [
        activeTurnId,
        conversation.projection.composer_locked,
        conversation.projection.in_flight_turn_id,
        conversation.projection.pending_request_id,
        hasLiveTimelineItems,
        hasRunningTimelineRow,
        rows,
    ]);

    const anchoredEndSpace = useMemo(
        () =>
            anchorIndex === undefined
                ? undefined
                : {
                      anchorIndex,
                      anchorMaxSize:
                          TIMELINE_ANCHOR_MAX_LINES * theme.fontSize.default.lineHeight +
                          theme.space(4),
                      anchorOffset: contentTopInset + theme.space(5),
                  },
        [anchorIndex, contentTopInset, theme],
    );

    useEffect(() => {
        onExpandedKeysChange(expandedKeys);
    }, [expandedKeys, onExpandedKeysChange]);

    useEffect(() => {
        if (!hasLiveTimelineItems && !hasRunningTimelineRow) {
            return;
        }

        const timer = setInterval(() => {
            setTimelineNowMs(Date.now());
        }, 1_000);

        return () => {
            clearInterval(timer);
        };
    }, [hasLiveTimelineItems, hasRunningTimelineRow]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setRefreshing(false);
        }
    }, [onRefresh]);

    const toggleExpandedRow = useCallback((row: TimelineRow) => {
        setExpandedRows((current) => ({
            ...current,
            [row.key]: !(current[row.key] ?? defaultExpanded(row)),
        }));
    }, []);

    const listExtraData = useMemo(
        () => ({
            expandedRows,
            mcpServerIdByName,
            pendingRequests,
            timelineNowMs,
        }),
        [expandedRows, mcpServerIdByName, pendingRequests, timelineNowMs],
    );

    const emptyMessage = closed ? closedLabel : connected ? emptyLabel : disconnectedLabel;

    const renderTimelineItem = useCallback(
        ({ item }: { item: TimelineRow }) => (
            <TimelineRowContainer
                row={item}
                expanded={expandedRows[item.key] ?? defaultExpanded(item)}
                mcpServerIdByName={mcpServerIdByName}
                onOpenArtifact={onOpenArtifact}
                onOpenMcpServer={onOpenMcpServer}
                onToggleExpanded={() => toggleExpandedRow(item)}
            />
        ),
        [expandedRows, mcpServerIdByName, onOpenArtifact, onOpenMcpServer, toggleExpandedRow],
    );

    return (
        <Box style={styles.timelineRoot}>
            <KeyboardAwareLegendList<TimelineRow>
                ref={timelineRef}
                alignItemsAtEnd
                anchoredEndSpace={anchoredEndSpace}
                contentInsetEndAdjustment={contentInsetEndAdjustment}
                data={rows}
                drawDistance={TIMELINE_DRAW_DISTANCE}
                estimatedItemSize={TIMELINE_ESTIMATED_ITEM_SIZE}
                extraData={listExtraData}
                getItemType={(row) => row.type}
                initialScrollAtEnd
                keyExtractor={(row) => row.key}
                keyboardDismissMode="interactive"
                keyboardLiftBehavior={TIMELINE_KEYBOARD_LIFT_BEHAVIOR}
                keyboardOffset={keyboardOffset}
                ListHeaderComponent={ListHeaderComponent}
                maintainScrollAtEnd={{
                    animated: false,
                    on: { dataChange: true, itemLayout: true, layout: true },
                }}
                maintainScrollAtEndThreshold={BOTTOM_FOLLOW_THRESHOLD_RATIO}
                maintainVisibleContentPosition
                onRefresh={handleRefresh}
                recycleItems
                refreshing={refreshing}
                renderItem={renderTimelineItem}
                scrollEnabled={rowCount > 0}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                style={styles.timelineList}
                contentContainerStyle={[
                    styles.content,
                    contentTopInset > 0 && { paddingTop: contentTopInset },
                ]}
            />
            {rowCount === 0 ? (
                <TimelineEmptyOverlay
                    loading={loading}
                    message={emptyMessage}
                    loadingLabel={loadingLabel}
                    contentTopInset={contentTopInset}
                    contentBottomInset={contentBottomInset}
                    keyboardOffset={keyboardOffset}
                />
            ) : null}
        </Box>
    );
};

const TimelineEmptyOverlay = ({
    loading,
    message,
    loadingLabel,
    contentTopInset,
    contentBottomInset,
    keyboardOffset,
}: {
    loading: boolean;
    message: string;
    loadingLabel: string;
    contentTopInset: number;
    contentBottomInset: number;
    keyboardOffset: number;
}) => {
    const { theme } = useUnistyles();
    const { height, progress } = useReanimatedKeyboardAnimation();

    const animatedStyle = useAnimatedStyle(() => {
        const openedOffset = interpolate(progress.value, [0, 1], [0, keyboardOffset]);

        return {
            transform: [{ translateY: (height.value + openedOffset) / 2 }],
        };
    }, [keyboardOffset]);

    return (
        <Box pointerEvents="none" style={styles.emptyOverlay}>
            <Reanimated.View style={[styles.emptyAnimatedFrame, animatedStyle]}>
                {loading ? (
                    <VStack
                        style={[
                            styles.loadingWrap,
                            contentTopInset > 0 && { paddingTop: contentTopInset },
                            contentBottomInset > 0 && { paddingBottom: contentBottomInset },
                        ]}
                    >
                        <Spinner color={theme.colors.infoText} />
                        <Text style={styles.loadingText}>{loadingLabel}</Text>
                    </VStack>
                ) : (
                    <Box
                        style={[
                            styles.emptyWrap,
                            contentTopInset > 0 && { paddingTop: contentTopInset },
                            contentBottomInset > 0 && { paddingBottom: contentBottomInset },
                        ]}
                    >
                        <Text style={styles.emptyText}>{message}</Text>
                    </Box>
                )}
            </Reanimated.View>
        </Box>
    );
};

const TimelineRowContainer = ({
    row,
    expanded,
    mcpServerIdByName,
    onOpenArtifact,
    onOpenMcpServer,
    onToggleExpanded,
}: {
    row: TimelineRow;
    expanded: boolean;
    mcpServerIdByName: Readonly<Record<string, string>>;
    onOpenArtifact?: (artifactId: string) => void;
    onOpenMcpServer?: (serverId: string) => void;
    onToggleExpanded: () => void;
}) => {
    return (
        <Box>
            <TimelineRowRenderer
                row={row}
                expanded={expanded}
                mcpServerIdByName={mcpServerIdByName}
                onOpenArtifact={onOpenArtifact}
                onOpenMcpServer={onOpenMcpServer}
                onToggleExpanded={onToggleExpanded}
            />
        </Box>
    );
};

const TimelineRowRenderer = ({
    row,
    expanded,
    mcpServerIdByName,
    onOpenArtifact,
    onOpenMcpServer,
    onToggleExpanded,
}: {
    row: TimelineRow;
    expanded: boolean;
    mcpServerIdByName: Readonly<Record<string, string>>;
    onOpenArtifact?: (artifactId: string) => void;
    onOpenMcpServer?: (serverId: string) => void;
    onToggleExpanded: () => void;
}) => {
    switch (row.type) {
        case 'user-message':
            return <UserMessageRow row={row} onOpenArtifact={onOpenArtifact} />;
        case 'assistant-message':
            return (
                <AssistantMessageRow row={row} expanded={expanded} onToggle={onToggleExpanded} />
            );
        case 'reasoning':
            return <ReasoningRow row={row} expanded={expanded} onToggle={onToggleExpanded} />;
        case 'system-event':
            return <SystemEventRow row={row} expanded={expanded} onToggle={onToggleExpanded} />;
        case 'command-execution':
            return (
                <CommandExecutionRow row={row} expanded={expanded} onToggle={onToggleExpanded} />
            );
        case 'file-change':
            return <FileChangeRow row={row} expanded={expanded} onToggle={onToggleExpanded} />;
        case 'tool-call':
            return (
                <ToolCallRow
                    row={row}
                    expanded={expanded}
                    mcpServerIdByName={mcpServerIdByName}
                    onOpenMcpServer={onOpenMcpServer}
                    onToggle={onToggleExpanded}
                />
            );
        case 'task-anchor':
            return <TaskAnchorRow row={row} />;
        case 'work-group':
            return <WorkGroupRow row={row} expanded={expanded} onToggle={onToggleExpanded} />;
        case 'tool-group':
            return <ToolGroupRow row={row} expanded={expanded} onToggle={onToggleExpanded} />;
        case 'running':
            return <RunningRow row={row} />;
        case 'cli-runtime-request':
            return <CLIRuntimePendingRequestCard entry={row.entry} />;
        case 'artifact':
            return <ArtifactRow row={row} />;
        case 'unknown':
            return <UnknownRow row={row} />;
    }
};

const defaultExpanded = (row: TimelineRow) => {
    switch (row.type) {
        case 'reasoning':
            return row.streaming || !row.collapsed;
        case 'command-execution':
        case 'file-change':
        case 'tool-call':
            return isActiveStatus(row.status);
        case 'work-group':
        case 'tool-group':
            return row.expanded;
        case 'running':
        case 'cli-runtime-request':
            return false;
        default:
            return false;
    }
};

const isActiveStatus = (status: string) => {
    const normalized = status.toLowerCase();
    return (
        normalized.includes('running') ||
        normalized.includes('stream') ||
        normalized.includes('pending')
    );
};

const findLastIndex = <T,>(items: readonly T[], predicate: (item: T) => boolean) => {
    for (let index = items.length - 1; index >= 0; index -= 1) {
        if (predicate(items[index]!)) {
            return index;
        }
    }

    return -1;
};

const activeProjectionTurnId = (turns: ClientActiveThreadSnapshot['projection']['turns']) => {
    const activeTurn = findLast(
        turns,
        (turn) =>
            turn.phase === 'Starting' || turn.phase === 'Running' || turn.phase === 'Completing',
    );

    return activeTurn?.id ?? null;
};

const latestAnchorableUserMessageIndex = (rows: readonly TimelineRow[]) => {
    const latestUserMessageIndex = findLastIndex(rows, (row) => row.type === 'user-message');

    if (latestUserMessageIndex < 0) {
        return -1;
    }

    const hasAssistantAfterLatestUser = rows
        .slice(latestUserMessageIndex + 1)
        .some((row) => row.type === 'assistant-message');

    return hasAssistantAfterLatestUser ? -1 : latestUserMessageIndex;
};

const findLast = <T,>(items: readonly T[], predicate: (item: T) => boolean) => {
    for (let index = items.length - 1; index >= 0; index -= 1) {
        if (predicate(items[index]!)) {
            return items[index]!;
        }
    }

    return null;
};

const timelineRowTurnId = (row: TimelineRow) => ('turnId' in row ? row.turnId : null);

const styles = StyleSheet.create((theme) => ({
    timelineRoot: {
        flex: 1,
    },
    timelineList: {
        flex: 1,
    },
    content: {
        paddingHorizontal: theme.space(4),
        paddingBottom: theme.space(TIMELINE_CONTENT_BOTTOM_PADDING_UNITS),
    },
    emptyOverlay: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    },
    emptyAnimatedFrame: {
        flex: 1,
    },
    loadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space(2),
        paddingHorizontal: theme.space(6),
    },
    loadingText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    emptyWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space(3),
        paddingHorizontal: theme.space(6),
    },
    emptyText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        textAlign: 'center',
    },
    emptyRefreshButton: {
        minHeight: theme.space(10),
        minWidth: theme.space(28),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.accent,
        paddingHorizontal: theme.space(3.5),
    },
    emptyRefreshButtonPressed: {
        opacity: 0.82,
    },
    emptyRefreshText: {
        color: theme.colors.accentForeground,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.bold.fontWeight,
    },
}));

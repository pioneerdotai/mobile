import {
    forwardRef,
    useCallback,
    useEffect,
    useMemo,
    useRef,
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
import type { LegendListRef, OnViewableItemsChanged } from '@legendapp/list/react-native';

import type { ClientActiveThreadSnapshot } from '@/client';
import {
    formatElapsedMs,
    projectConversationToRows,
} from '@/services/threads/conversation/projector';
import type { TimelinePendingRequest, TimelineRow } from '@/services/threads/conversation/timeline';
import { PendingRequestCard } from '@/components/thread/cli-runtime-pending-requests';
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
import { viewportPrefetchPlan } from './viewport-prefetch';
import type { TimelineViewportPrefetchPlan } from './viewport-prefetch';
import { defaultTimelineRowExpanded } from './row-expansion';
import { VStack } from '@/components/primitives/vstack';

export type {
    TimelineTurnWorkBoundaryHint,
    TimelineViewportPrefetchPlan,
} from './viewport-prefetch';

type ThreadTimelineProps = {
    conversation: ClientActiveThreadSnapshot;
    timelineIdentityKey: string;
    rowsOverride?: TimelineRow[] | null;
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
    emptyReady?: boolean;
    ListHeaderComponent?: ReactElement | null;
    keyboardOffset: number;
    contentInsetEndAdjustment: SharedValue<number>;
    mcpServerIdByName: Readonly<Record<string, string>>;
    onOpenArtifact?: (artifactId: string) => void;
    onOpenMcpServer?: (serverId: string) => void;
    onOpenTaskThread?: (row: Extract<TimelineRow, { type: 'task-anchor' }>) => void;
    onExpandedKeysChange: (keys: string[]) => void;
    onViewportPrefetchPlanChange?: (plan: TimelineViewportPrefetchPlan) => void;
    onRefresh: () => Promise<void>;
};

const BOTTOM_FOLLOW_THRESHOLD_RATIO = 0.12;
const TIMELINE_DRAW_DISTANCE = 640;
const TIMELINE_ESTIMATED_ITEM_SIZE = 64;
const TIMELINE_CONTENT_BOTTOM_PADDING_UNITS = 6;
const TIMELINE_KEYBOARD_LIFT_BEHAVIOR = 'whenAtEnd';
const TIMELINE_VIEWABILITY_CONFIG = {
    itemVisiblePercentThreshold: 1,
};

export const ThreadTimeline = forwardRef<LegendListRef, ThreadTimelineProps>((props, ref) => {
    return <ThreadTimelineContent {...props} timelineRef={ref} />;
});

ThreadTimeline.displayName = 'ThreadTimeline';

type ThreadTimelineContentProps = ThreadTimelineProps & {
    timelineRef: Ref<LegendListRef>;
};

const ThreadTimelineContent = ({
    conversation,
    timelineIdentityKey,
    rowsOverride,
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
    emptyReady = true,
    ListHeaderComponent,
    keyboardOffset,
    contentInsetEndAdjustment,
    mcpServerIdByName,
    onOpenArtifact,
    onOpenMcpServer,
    onOpenTaskThread,
    onExpandedKeysChange,
    onViewportPrefetchPlanChange,
    onRefresh,
    timelineRef,
}: ThreadTimelineContentProps) => {
    const [refreshing, setRefreshing] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [timelineNowMs, setTimelineNowMs] = useState(() => Date.now());
    const lastViewportPrefetchPlanKeyRef = useRef<string | null>(null);
    const viewportScrollIntentGenerationRef = useRef(0);
    const consumedViewportScrollIntentGenerationRef = useRef(0);

    useEffect(() => {
        lastViewportPrefetchPlanKeyRef.current = null;
        viewportScrollIntentGenerationRef.current = 0;
        consumedViewportScrollIntentGenerationRef.current = 0;
    }, [timelineIdentityKey]);

    const expandedKeys = useMemo(
        () => Object.keys(expandedRows).filter((key) => expandedRows[key]),
        [expandedRows],
    );

    const hasLiveTimelineItems = useMemo(
        () =>
            rowsOverride
                ? rowsOverride.some((row) => row.type === 'running' || timelineRowIsStreaming(row))
                : conversation.projection.items.some((item) => item.status === 'Running'),
        [conversation, rowsOverride],
    );

    const rows = useMemo(
        () =>
            rowsOverride
                ? insertPendingRequestRows(
                      hydrateRunningRowsElapsed(rowsOverride, timelineNowMs),
                      pendingRequests,
                  )
                : projectConversationToRows(conversation, {
                      expandedKeys: expandedRows,
                      nowMs: timelineNowMs,
                      pendingRequests,
                  }),
        [conversation, expandedRows, pendingRequests, rowsOverride, timelineNowMs],
    );

    const rowCount = rows.length;
    const hasRunningTimelineRow = useMemo(() => rows.some((row) => row.type === 'running'), [rows]);

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
            [row.key]: !(current[row.key] ?? defaultTimelineRowExpanded(row)),
        }));
    }, []);

    const markViewportScrollIntent = useCallback(() => {
        viewportScrollIntentGenerationRef.current += 1;
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
                expanded={expandedRows[item.key] ?? defaultTimelineRowExpanded(item)}
                mcpServerIdByName={mcpServerIdByName}
                onOpenArtifact={onOpenArtifact}
                onOpenMcpServer={onOpenMcpServer}
                onOpenTaskThread={onOpenTaskThread}
                onToggleExpanded={() => toggleExpandedRow(item)}
            />
        ),
        [
            expandedRows,
            mcpServerIdByName,
            onOpenArtifact,
            onOpenMcpServer,
            onOpenTaskThread,
            toggleExpandedRow,
        ],
    );
    const handleViewableItemsChanged = useCallback<
        NonNullable<OnViewableItemsChanged<TimelineRow>>
    >(
        (info) => {
            if (!onViewportPrefetchPlanChange) {
                return;
            }
            const scrollIntentGeneration = viewportScrollIntentGenerationRef.current;
            if (scrollIntentGeneration <= consumedViewportScrollIntentGenerationRef.current) {
                return;
            }

            const visibleIndices = info.viewableItems
                .map((token) => token.index)
                .filter((index) => index >= 0 && index < rows.length);
            const plan = viewportPrefetchPlan(rows, visibleIndices, info.start, info.end);
            if (!plan || plan.key === lastViewportPrefetchPlanKeyRef.current) {
                return;
            }

            lastViewportPrefetchPlanKeyRef.current = plan.key;
            consumedViewportScrollIntentGenerationRef.current = scrollIntentGeneration;
            onViewportPrefetchPlanChange(plan);
        },
        [onViewportPrefetchPlanChange, rows],
    );

    return (
        <Box style={styles.timelineRoot}>
            <KeyboardAwareLegendList<TimelineRow>
                key={timelineIdentityKey}
                ref={timelineRef}
                alignItemsAtEnd
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
                onMomentumScrollBegin={markViewportScrollIntent}
                onScrollBeginDrag={markViewportScrollIntent}
                onViewableItemsChanged={handleViewableItemsChanged}
                onRefresh={handleRefresh}
                recycleItems
                refreshing={refreshing}
                renderItem={renderTimelineItem}
                scrollEnabled={rowCount > 0}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                style={styles.timelineList}
                viewabilityConfig={TIMELINE_VIEWABILITY_CONFIG}
                contentContainerStyle={[
                    styles.content,
                    contentTopInset > 0 && { paddingTop: contentTopInset },
                ]}
            />
            {rowCount === 0 && emptyReady ? (
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
    onOpenTaskThread,
    onToggleExpanded,
}: {
    row: TimelineRow;
    expanded: boolean;
    mcpServerIdByName: Readonly<Record<string, string>>;
    onOpenArtifact?: (artifactId: string) => void;
    onOpenMcpServer?: (serverId: string) => void;
    onOpenTaskThread?: (row: Extract<TimelineRow, { type: 'task-anchor' }>) => void;
    onToggleExpanded: () => void;
}) => {
    return (
        <Box style={styles.timelineRow}>
            <TimelineRowRenderer
                row={row}
                expanded={expanded}
                mcpServerIdByName={mcpServerIdByName}
                onOpenArtifact={onOpenArtifact}
                onOpenMcpServer={onOpenMcpServer}
                onOpenTaskThread={onOpenTaskThread}
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
    onOpenTaskThread,
    onToggleExpanded,
}: {
    row: TimelineRow;
    expanded: boolean;
    mcpServerIdByName: Readonly<Record<string, string>>;
    onOpenArtifact?: (artifactId: string) => void;
    onOpenMcpServer?: (serverId: string) => void;
    onOpenTaskThread?: (row: Extract<TimelineRow, { type: 'task-anchor' }>) => void;
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
            return <TaskAnchorRow row={row} onOpenTaskThread={onOpenTaskThread} />;
        case 'work-group':
            return <WorkGroupRow row={row} expanded={expanded} onToggle={onToggleExpanded} />;
        case 'tool-group':
            return <ToolGroupRow row={row} expanded={expanded} onToggle={onToggleExpanded} />;
        case 'running':
            return <RunningRow row={row} />;
        case 'pending-request':
            return <PendingRequestCard entry={row.entry} />;
        case 'artifact':
            return <ArtifactRow row={row} />;
        case 'unknown':
            return <UnknownRow row={row} />;
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

const timelineRowIsStreaming = (row: TimelineRow) => {
    switch (row.type) {
        case 'assistant-message':
        case 'reasoning':
        case 'command-execution':
            return row.streaming;
        case 'file-change':
        case 'tool-call':
            return isActiveStatus(row.status);
        default:
            return false;
    }
};

const insertPendingRequestRows = (
    rows: readonly TimelineRow[],
    pendingRequests: readonly TimelinePendingRequest[],
): TimelineRow[] => {
    if (pendingRequests.length === 0) {
        return [...rows];
    }

    const existingRequestKeys = new Set(
        rows.filter((row) => row.type === 'pending-request').map((row) => row.key),
    );
    const requestRows = pendingRequests.flatMap((entry): TimelineRow[] => {
        const key = `timeline-pending-request::${entry.request.request_id}`;
        if (existingRequestKeys.has(key)) {
            return [];
        }

        return [
            {
                type: 'pending-request',
                key,
                turnId: entry.turn_id,
                entry,
            },
        ];
    });
    if (requestRows.length === 0) {
        return [...rows];
    }

    const runningIndex = rows.findIndex((row) => row.type === 'running');

    if (runningIndex < 0) {
        return [...rows, ...requestRows];
    }

    return [...rows.slice(0, runningIndex), ...requestRows, ...rows.slice(runningIndex)];
};

const hydrateRunningRowsElapsed = (rows: readonly TimelineRow[], nowMs: number): TimelineRow[] =>
    rows.map((row) => {
        if (row.type !== 'running') {
            return row;
        }

        const startedAtUnixMs = row.startedAtUnixMs ?? null;
        const elapsedMs = Math.max(0, nowMs - (startedAtUnixMs ?? nowMs));
        const elapsedLabel = elapsedMs >= 1_000 ? formatElapsedMs(elapsedMs) : null;

        return row.elapsedLabel === elapsedLabel ? row : { ...row, elapsedLabel };
    });

const styles = StyleSheet.create((theme) => ({
    timelineRoot: {
        flex: 1,
    },
    timelineList: {
        flex: 1,
    },
    timelineRow: {
        width: '100%',
        maxWidth: '100%',
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

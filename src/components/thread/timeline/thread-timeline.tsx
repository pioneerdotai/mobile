import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
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
    useSharedValue,
    type SharedValue,
} from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { KeyboardAwareLegendList } from '@legendapp/list/keyboard';
import type { LegendListRef, OnViewableItemsChanged } from '@legendapp/list/react-native';
import { useTranslation } from 'react-i18next';

import type { ClientActiveThreadSnapshot, MemberSummary } from '@/client';
import {
    formatElapsedMs,
    projectConversationToRows,
} from '@/services/threads/conversation/projector';
import type { TimelinePendingRequest, TimelineRow } from '@/services/threads/conversation/timeline';
import { PendingRequestCard } from '@/components/thread/cli-runtime-pending-requests';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';
import Spinner from '@/components/feedback/spinner';
import { MessageActionsSheet } from '@/components/overlays/message-actions';

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
import { timelineRowsAreEqual } from './timeline-row-equality';
import { viewedThroughLatestUserTurn } from './read-viewability';
import { ensureTimelineRowRenderFingerprint } from '@/services/threads/conversation/render-fingerprint';
import { applyCurrentMemberProfilesToTimelineRows } from '@/services/threads/timeline-member-profiles';
import { VStack } from '@/components/primitives/vstack';
import {
    mobileArtifactActionKey,
    type MobileArtifactActionState,
} from '@/services/artifacts/mobile-action-state';
import { TimelineAvatarRail, TimelineAvatarRailController } from './timeline-avatar-rail';
import {
    TIMELINE_AVATAR_RAIL_WIDTH_UNITS,
    TIMELINE_AVATAR_SIZE_UNITS,
    TIMELINE_GROUP_VERTICAL_PADDING_UNITS,
    TimelineGroupingIndex,
    type TimelinePresentationContext,
    type TimelineRowLayout,
} from './timeline-grouping';

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
    semanticWorkItemKeys?: ReadonlySet<string>;
    contentTopInset?: number;
    avatarRailTopInset?: number;
    contentBottomInset?: number;
    emptyReady?: boolean;
    ListHeaderComponent?: ReactElement | null;
    keyboardOffset: number;
    contentInsetEndAdjustment: SharedValue<number>;
    mcpServerIdByName: Readonly<Record<string, string>>;
    artifactWorkspaceId?: string | null;
    onOpenArtifact?: (artifactId: string, versionId: string | null) => void;
    onShareArtifact?: (artifactId: string, versionId: string | null) => void;
    onCancelArtifactDownload?: (
        artifactId: string,
        versionId: string | null,
        operationId: string,
    ) => void;
    artifactActionStateByKey?: Readonly<Record<string, MobileArtifactActionState>>;
    currentPrincipalId?: string | null;
    canReviewTasks?: boolean;
    canCancelTasks?: boolean;
    canRespondToAgentRequests?: boolean;
    memberProfiles?: readonly MemberSummary[];
    presentationContext?: TimelinePresentationContext;
    onOpenMessageRevisions?: (turnId: string) => void;
    onReplyToMessage?: (row: Extract<TimelineRow, { type: 'user-message' }>) => void;
    onEditMessage?: (row: Extract<TimelineRow, { type: 'user-message' }>) => void;
    onDeleteMessage?: (row: Extract<TimelineRow, { type: 'user-message' }>) => void;
    onViewedThroughUserTurn?: (turnId: string) => void;
    onOpenMcpServer?: (serverId: string) => void;
    onOpenTaskThread?: (row: Extract<TimelineRow, { type: 'task-anchor' }>) => void;
    onExpandedKeysChange: (keys: string[]) => void;
    onViewportPrefetchPlanChange?: (plan: TimelineViewportPrefetchPlan) => void;
    onRefresh: () => Promise<void>;
};

const EMPTY_MEMBER_PROFILES: readonly MemberSummary[] = [];
const BOTTOM_FOLLOW_THRESHOLD_RATIO = 0.12;
const TIMELINE_DRAW_DISTANCE = 640;
const TIMELINE_ESTIMATED_ITEM_SIZE = 64;
const TIMELINE_CONTENT_BOTTOM_PADDING_UNITS = 6;
const TIMELINE_KEYBOARD_LIFT_BEHAVIOR = 'whenAtEnd';
const TIMELINE_VIEWABILITY_CONFIG = {
    itemVisiblePercentThreshold: 1,
};
type UserMessageTimelineRow = Extract<TimelineRow, { type: 'user-message' }>;
type AssistantMessageTimelineRow = Extract<TimelineRow, { type: 'assistant-message' }>;
type MessageActionsTimelineRow = UserMessageTimelineRow | AssistantMessageTimelineRow;
type MessageActionsTarget = {
    timelineIdentityKey: string;
    row: MessageActionsTimelineRow;
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
    semanticWorkItemKeys,
    contentTopInset = 0,
    avatarRailTopInset = 0,
    contentBottomInset = 0,
    emptyReady = true,
    ListHeaderComponent,
    keyboardOffset,
    contentInsetEndAdjustment,
    mcpServerIdByName,
    artifactWorkspaceId,
    onOpenArtifact,
    onShareArtifact,
    onCancelArtifactDownload,
    artifactActionStateByKey,
    currentPrincipalId,
    canReviewTasks = false,
    canCancelTasks = false,
    canRespondToAgentRequests = false,
    memberProfiles = EMPTY_MEMBER_PROFILES,
    presentationContext,
    onOpenMessageRevisions,
    onReplyToMessage,
    onEditMessage,
    onDeleteMessage,
    onViewedThroughUserTurn,
    onOpenMcpServer,
    onOpenTaskThread,
    onExpandedKeysChange,
    onViewportPrefetchPlanChange,
    onRefresh,
    timelineRef,
}: ThreadTimelineContentProps) => {
    const [refreshing, setRefreshing] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [messageActionsTarget, setMessageActionsTarget] = useState<MessageActionsTarget | null>(
        null,
    );
    const [timelineNowMs, setTimelineNowMs] = useState(() => Date.now());
    const lastViewportPrefetchPlanKeyRef = useRef<string | null>(null);
    const viewportScrollIntentGenerationRef = useRef(0);
    const consumedViewportScrollIntentGenerationRef = useRef(0);
    const internalTimelineRef = useRef<LegendListRef | null>(null);
    const avatarRailController = useMemo(() => new TimelineAvatarRailController(), []);
    const listScrollOffset = useSharedValue(0);
    const listSharedValues = useMemo(
        () => ({ scrollOffset: listScrollOffset }),
        [listScrollOffset],
    );
    useImperativeHandle(timelineRef, () => internalTimelineRef.current as LegendListRef);

    useEffect(() => {
        lastViewportPrefetchPlanKeyRef.current = null;
        viewportScrollIntentGenerationRef.current = 0;
        consumedViewportScrollIntentGenerationRef.current = 0;
        avatarRailController.setVisibleGroups(timelineIdentityKey, []);
    }, [avatarRailController, timelineIdentityKey]);

    const messageActionsRow =
        messageActionsTarget?.timelineIdentityKey === timelineIdentityKey
            ? messageActionsTarget.row
            : null;
    const messageActionsRowKey = messageActionsRow?.key ?? null;
    const openMessageActions = useCallback(
        (row: MessageActionsTimelineRow) => {
            setMessageActionsTarget({ timelineIdentityKey, row });
        },
        [timelineIdentityKey],
    );
    const closeMessageActions = useCallback(() => {
        setMessageActionsTarget(null);
    }, []);

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

    const projectedRows = useMemo(
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
                      semanticWorkItemKeys,
                  }),
        [
            conversation,
            expandedRows,
            pendingRequests,
            rowsOverride,
            semanticWorkItemKeys,
            timelineNowMs,
        ],
    );
    const rows = useMemo(
        () => applyCurrentMemberProfilesToTimelineRows(projectedRows, memberProfiles),
        [memberProfiles, projectedRows],
    );
    const timelineGrouping = useMemo(
        () => TimelineGroupingIndex.build(rows, currentPrincipalId, presentationContext),
        [currentPrincipalId, presentationContext, rows],
    );
    const updateVisibleAvatarGroups = useCallback(
        (visibleIndices: number[]) => {
            const nextKeys = timelineGrouping.visibleAvatarGroupKeys(visibleIndices);
            avatarRailController.setVisibleGroups(timelineIdentityKey, nextKeys);
        },
        [avatarRailController, timelineGrouping, timelineIdentityKey],
    );
    const handleTimelineItemSizeChanged = useCallback(
        ({ index }: { index: number }) => {
            const group = timelineGrouping.avatarGroupAt(index);
            if (group?.endIndex === index) {
                avatarRailController.synchronizeGroup(group.key);
            }
        },
        [avatarRailController, timelineGrouping],
    );

    useEffect(() => {
        avatarRailController.synchronizeVisibleGroups();
    }, [avatarRailController, timelineGrouping]);

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
            artifactWorkspaceId,
            artifactActionStateByKey,
            currentPrincipalId,
            canReviewTasks,
            canCancelTasks,
            canRespondToAgentRequests,
            messageActionsRowKey,
            timelineGroupingFingerprint: timelineGrouping.renderFingerprint,
        }),
        [
            artifactActionStateByKey,
            artifactWorkspaceId,
            currentPrincipalId,
            canReviewTasks,
            canCancelTasks,
            canRespondToAgentRequests,
            expandedRows,
            messageActionsRowKey,
            mcpServerIdByName,
            timelineGrouping.renderFingerprint,
        ],
    );

    const emptyMessage = closed ? closedLabel : connected ? emptyLabel : disconnectedLabel;

    const renderTimelineItem = useCallback(
        ({ item, index }: { item: TimelineRow; index: number }) => (
            <TimelineRowContainer
                row={item}
                threadId={conversation.thread_id ?? ''}
                rowLayout={timelineGrouping.rowLayout(index)}
                expanded={expandedRows[item.key] ?? defaultTimelineRowExpanded(item)}
                mcpServerIdByName={mcpServerIdByName}
                artifactWorkspaceId={artifactWorkspaceId}
                onOpenArtifact={onOpenArtifact}
                onShareArtifact={onShareArtifact}
                onCancelArtifactDownload={onCancelArtifactDownload}
                artifactActionState={
                    item.type === 'artifact'
                        ? artifactActionStateByKey?.[
                              mobileArtifactActionKey(
                                  artifactWorkspaceId ?? '',
                                  item.artifactId,
                                  null,
                              )
                          ]
                        : undefined
                }
                artifactActionStateByKey={artifactActionStateByKey}
                currentPrincipalId={currentPrincipalId}
                canReviewTasks={canReviewTasks}
                canCancelTasks={canCancelTasks}
                canRespondToAgentRequests={canRespondToAgentRequests}
                presentationContext={presentationContext}
                messageActionsRowKey={messageActionsRowKey}
                onOpenMessageActions={openMessageActions}
                onOpenMcpServer={onOpenMcpServer}
                onOpenTaskThread={onOpenTaskThread}
                onToggleExpanded={() => toggleExpandedRow(item)}
            />
        ),
        [
            expandedRows,
            conversation.thread_id,
            timelineGrouping,
            mcpServerIdByName,
            artifactWorkspaceId,
            onOpenArtifact,
            onShareArtifact,
            onCancelArtifactDownload,
            artifactActionStateByKey,
            currentPrincipalId,
            canReviewTasks,
            canCancelTasks,
            canRespondToAgentRequests,
            presentationContext,
            messageActionsRowKey,
            openMessageActions,
            onOpenMcpServer,
            onOpenTaskThread,
            toggleExpandedRow,
        ],
    );
    const getTimelineItemType = useCallback(
        (row: TimelineRow, index: number) => {
            const rowLayout = timelineGrouping.rowLayout(index);
            const groupPosition = rowLayout.startsAvatarGroup
                ? 'start'
                : rowLayout.compactTopSpacing
                  ? 'continuation'
                  : 'single';
            return `${row.type}:${rowLayout.groupKind}:${groupPosition}`;
        },
        [timelineGrouping],
    );
    const handleViewableItemsChanged = useCallback<
        NonNullable<OnViewableItemsChanged<TimelineRow>>
    >(
        (info) => {
            const visibleIndices = info.viewableItems
                .map((token) => token.index)
                .filter((index) => index >= 0 && index < rows.length);
            updateVisibleAvatarGroups(visibleIndices);
            const viewedThroughTurnId = viewedThroughLatestUserTurn(rows, visibleIndices);
            if (viewedThroughTurnId) {
                onViewedThroughUserTurn?.(viewedThroughTurnId);
            }

            if (!onViewportPrefetchPlanChange) return;
            const scrollIntentGeneration = viewportScrollIntentGenerationRef.current;
            if (scrollIntentGeneration <= consumedViewportScrollIntentGenerationRef.current) {
                return;
            }
            const plan = viewportPrefetchPlan(rows, visibleIndices, info.start, info.end);
            if (!plan || plan.key === lastViewportPrefetchPlanKeyRef.current) {
                return;
            }

            lastViewportPrefetchPlanKeyRef.current = plan.key;
            consumedViewportScrollIntentGenerationRef.current = scrollIntentGeneration;
            onViewportPrefetchPlanChange(plan);
        },
        [onViewedThroughUserTurn, onViewportPrefetchPlanChange, rows, updateVisibleAvatarGroups],
    );

    return (
        <Box style={styles.timelineRoot}>
            <KeyboardAwareLegendList<TimelineRow>
                key={timelineIdentityKey}
                ref={internalTimelineRef}
                alignItemsAtEnd
                contentInsetEndAdjustment={contentInsetEndAdjustment}
                data={rows}
                drawDistance={TIMELINE_DRAW_DISTANCE}
                estimatedItemSize={TIMELINE_ESTIMATED_ITEM_SIZE}
                extraData={listExtraData}
                getItemType={getTimelineItemType}
                initialScrollAtEnd
                itemsAreEqual={timelineRowsAreEqual}
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
                onItemSizeChanged={handleTimelineItemSizeChanged}
                onScrollBeginDrag={markViewportScrollIntent}
                onViewableItemsChanged={handleViewableItemsChanged}
                onRefresh={handleRefresh}
                recycleItems
                refreshing={refreshing}
                renderItem={renderTimelineItem}
                sharedValues={listSharedValues}
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
            <TimelineAvatarRail
                controller={avatarRailController}
                connected={connected}
                contentInsetEndAdjustment={contentInsetEndAdjustment}
                contentTopInset={contentTopInset}
                grouping={timelineGrouping}
                listRef={internalTimelineRef}
                scrollOffset={listScrollOffset}
                timelineIdentityKey={timelineIdentityKey}
                viewportTopInset={avatarRailTopInset}
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
            <MessageActionsSheet
                row={messageActionsRow}
                currentPrincipalId={currentPrincipalId}
                onClose={closeMessageActions}
                onOpenRevisions={onOpenMessageRevisions}
                onReply={onReplyToMessage}
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
            />
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
    threadId,
    rowLayout,
    expanded,
    mcpServerIdByName,
    artifactWorkspaceId,
    onOpenArtifact,
    onShareArtifact,
    onCancelArtifactDownload,
    artifactActionState,
    artifactActionStateByKey,
    currentPrincipalId,
    canReviewTasks,
    canCancelTasks,
    canRespondToAgentRequests,
    presentationContext,
    messageActionsRowKey,
    onOpenMessageActions,
    onOpenMcpServer,
    onOpenTaskThread,
    onToggleExpanded,
}: {
    row: TimelineRow;
    threadId: string;
    rowLayout: TimelineRowLayout;
    expanded: boolean;
    mcpServerIdByName: Readonly<Record<string, string>>;
    artifactWorkspaceId?: string | null;
    onOpenArtifact?: (artifactId: string, versionId: string | null) => void;
    onShareArtifact?: (artifactId: string, versionId: string | null) => void;
    onCancelArtifactDownload?: (
        artifactId: string,
        versionId: string | null,
        operationId: string,
    ) => void;
    artifactActionState?: MobileArtifactActionState;
    artifactActionStateByKey?: Readonly<Record<string, MobileArtifactActionState>>;
    currentPrincipalId?: string | null;
    canReviewTasks: boolean;
    canCancelTasks: boolean;
    canRespondToAgentRequests: boolean;
    presentationContext?: TimelinePresentationContext;
    messageActionsRowKey: string | null;
    onOpenMessageActions: (row: MessageActionsTimelineRow) => void;
    onOpenMcpServer?: (serverId: string) => void;
    onOpenTaskThread?: (row: Extract<TimelineRow, { type: 'task-anchor' }>) => void;
    onToggleExpanded: () => void;
}) => {
    const { t } = useTranslation('threads');
    const isAgentGroup = rowLayout.groupKind === 'agent';

    return (
        <Box
            style={[
                styles.timelineRow,
                isAgentGroup && styles.agentTimelineRow,
                isAgentGroup && rowLayout.startsAvatarGroup && styles.agentGroupStart,
            ]}
        >
            {isAgentGroup && rowLayout.startsAvatarGroup ? (
                <HStack accessible style={styles.agentAuthor}>
                    <Text numberOfLines={1} style={styles.agentName}>
                        {t('modeAgentLabel')}
                    </Text>
                </HStack>
            ) : null}
            <TimelineRowRenderer
                row={row}
                threadId={threadId}
                compactTopSpacing={rowLayout.compactTopSpacing}
                expanded={expanded}
                mcpServerIdByName={mcpServerIdByName}
                artifactWorkspaceId={artifactWorkspaceId}
                onOpenArtifact={onOpenArtifact}
                onShareArtifact={onShareArtifact}
                onCancelArtifactDownload={onCancelArtifactDownload}
                artifactActionStateByKey={artifactActionStateByKey}
                currentPrincipalId={currentPrincipalId}
                canReviewTasks={canReviewTasks}
                canCancelTasks={canCancelTasks}
                canRespondToAgentRequests={canRespondToAgentRequests}
                presentationContext={presentationContext}
                messageActionsRowKey={messageActionsRowKey}
                onOpenMessageActions={onOpenMessageActions}
                artifactActionState={artifactActionState}
                onOpenMcpServer={onOpenMcpServer}
                onOpenTaskThread={onOpenTaskThread}
                onToggleExpanded={onToggleExpanded}
            />
        </Box>
    );
};

const TimelineRowRenderer = ({
    row,
    threadId,
    compactTopSpacing,
    expanded,
    mcpServerIdByName,
    artifactWorkspaceId,
    onOpenArtifact,
    onShareArtifact,
    onCancelArtifactDownload,
    artifactActionState,
    artifactActionStateByKey,
    currentPrincipalId,
    canReviewTasks,
    canCancelTasks,
    canRespondToAgentRequests,
    presentationContext,
    messageActionsRowKey,
    onOpenMessageActions,
    onOpenMcpServer,
    onOpenTaskThread,
    onToggleExpanded,
}: {
    row: TimelineRow;
    threadId: string;
    compactTopSpacing: boolean;
    expanded: boolean;
    mcpServerIdByName: Readonly<Record<string, string>>;
    artifactWorkspaceId?: string | null;
    onOpenArtifact?: (artifactId: string, versionId: string | null) => void;
    onShareArtifact?: (artifactId: string, versionId: string | null) => void;
    onCancelArtifactDownload?: (
        artifactId: string,
        versionId: string | null,
        operationId: string,
    ) => void;
    artifactActionState?: MobileArtifactActionState;
    artifactActionStateByKey?: Readonly<Record<string, MobileArtifactActionState>>;
    currentPrincipalId?: string | null;
    canReviewTasks: boolean;
    canCancelTasks: boolean;
    canRespondToAgentRequests: boolean;
    presentationContext?: TimelinePresentationContext;
    messageActionsRowKey: string | null;
    onOpenMessageActions: (row: MessageActionsTimelineRow) => void;
    onOpenMcpServer?: (serverId: string) => void;
    onOpenTaskThread?: (row: Extract<TimelineRow, { type: 'task-anchor' }>) => void;
    onToggleExpanded: () => void;
}) => {
    switch (row.type) {
        case 'user-message':
            return (
                <UserMessageRow
                    row={row}
                    compactTopSpacing={compactTopSpacing}
                    artifactWorkspaceId={artifactWorkspaceId}
                    onOpenArtifact={onOpenArtifact}
                    onShareArtifact={onShareArtifact}
                    onCancelArtifactDownload={onCancelArtifactDownload}
                    artifactActionStateByKey={artifactActionStateByKey}
                    currentPrincipalId={currentPrincipalId}
                    presentationContext={presentationContext}
                    onLongPress={(messageRow) => onOpenMessageActions(messageRow)}
                    textSelectionEnabled={messageActionsRowKey !== row.key}
                />
            );
        case 'assistant-message':
            return (
                <AssistantMessageRow
                    row={row}
                    expanded={expanded}
                    onToggle={onToggleExpanded}
                    onLongPress={() => onOpenMessageActions(row)}
                />
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
                    threadId={threadId}
                    expanded={expanded}
                    canReviewTasks={canReviewTasks}
                    canCancelTasks={canCancelTasks}
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
            return <RunningRow row={row} showDino={!presentationContext?.taskChildThread} />;
        case 'pending-request':
            return <PendingRequestCard entry={row.entry} canRespond={canRespondToAgentRequests} />;
        case 'artifact':
            return (
                <ArtifactRow
                    row={row}
                    actionState={artifactActionState}
                    onOpen={onOpenArtifact}
                    onShare={onShareArtifact}
                    onCancelDownload={onCancelArtifactDownload}
                />
            );
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

type StreamingTimelineRow = Extract<
    TimelineRow,
    | { type: 'assistant-message' }
    | { type: 'reasoning' }
    | { type: 'command-execution' }
    | { type: 'file-change' }
    | { type: 'tool-call' }
    | { type: 'task-anchor' }
>;

const timelineRowIsStreaming = (row: TimelineRow): row is StreamingTimelineRow => {
    switch (row.type) {
        case 'assistant-message':
        case 'reasoning':
        case 'command-execution':
            return row.streaming;
        case 'file-change':
        case 'tool-call':
            return isActiveStatus(row.status);
        case 'task-anchor':
            return row.status.toLowerCase() === 'running';
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
            ensureTimelineRowRenderFingerprint({
                type: 'pending-request',
                key,
                turnId: entry.turn_id,
                entry,
            }),
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
        if (row.type !== 'running' && !timelineRowIsStreaming(row)) {
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
        overflow: 'hidden',
    },
    timelineList: {
        flex: 1,
    },
    timelineRow: {
        width: '100%',
        maxWidth: '100%',
    },
    agentTimelineRow: {
        paddingLeft: theme.space(TIMELINE_AVATAR_RAIL_WIDTH_UNITS),
    },
    agentGroupStart: {
        paddingTop: theme.space(TIMELINE_GROUP_VERTICAL_PADDING_UNITS),
    },
    agentAuthor: {
        minHeight: theme.space(TIMELINE_AVATAR_SIZE_UNITS),
        alignItems: 'center',
        marginBottom: theme.space(1.5),
    },
    agentName: {
        minWidth: 0,
        flexShrink: 1,
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    content: {
        paddingHorizontal: theme.space(2),
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

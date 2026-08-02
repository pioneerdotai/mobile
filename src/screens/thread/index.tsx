import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, Text, View } from 'react-native';
import { KeyboardGestureArea, KeyboardStickyView } from 'react-native-keyboard-controller';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useKeyboardChatComposerInset } from '@legendapp/list/keyboard';
import type { LegendListRef } from '@legendapp/list/react-native';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { customAlphabet } from 'nanoid';

import {
    pioneerClient,
    type ClientActiveThreadSnapshot,
    type CLIRuntimeThreadBinding,
    type ComposerSkillChip,
    type ComposerSkillPickerProjection,
    type ComposerSkillSelection,
    type GatewaySettingsGetResponse,
    type VoiceSessionStartContext,
    type Thread,
    type TimelineBlock,
    type TurnWorkBlock,
    type VoiceSessionResultReduction,
    type VoiceStatusResponse,
    type VoiceTurnContext,
} from '@/client';
import Spinner from '@/components/feedback/spinner';
import {
    ThreadComposer,
    THREAD_COMPOSER_MIN_INPUT_HEIGHT,
} from '@/components/thread/composer/thread-composer';
import {
    ThreadTimeline,
    type TimelineTurnWorkBoundaryHint,
    type TimelineViewportPrefetchPlan,
} from '@/components/thread/timeline/thread-timeline';
import { useActiveThread } from '@/hooks/use-active-thread';
import { useGateway } from '@/hooks/use-gateway';
import { useTimelineReconnectInvalidation } from '@/hooks/use-timeline-reconnect-invalidation';
import { useThreadTimelineBlocksQuery } from '@/hooks/use-thread-timeline-blocks-query';
import { useTimelineQueryCancellation } from '@/hooks/use-timeline-query-cancellation';
import { useTurnWorkItemsQuery } from '@/hooks/use-turn-work-items-query';
import {
    useProviderModelDisplayName,
    useProviderModelReasoningEffortLabel,
} from '@/hooks/use-provider-model-display-name';
import {
    NATIVE_COMPOSER_CAPABILITY_POLICY,
    UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
    composerSubmissionPlanForProvider,
    composerCapabilityTargetForProvider,
    isCliRuntimeProvider,
} from '@/services/providers/cli-runtime';
import { refreshCliRuntimeSummaries } from '@/services/providers/cli-runtime-live';
import {
    projectSemanticTimelineToRows,
    type SemanticTurnWorkRange,
} from '@/services/threads/semantic-projector';
import { projectConversationToRows } from '@/services/threads/conversation/projector';
import { activeThreadSnapshot } from '@/services/threads/active';
import { seedEmptyThreadTimelineCache } from '@/services/threads/semantic-cache-patch';
import { cacheActiveThreadSnapshot } from '@/services/threads/timeline-query';
import { selectedReasoningEffortRequestFields } from '@/services/threads/reasoning-effort';
import { skillSelectionRequestFields } from '@/services/threads/skill-selection-request';
import type { TimelinePendingRequest, TimelineRow } from '@/services/threads/conversation/timeline';
import {
    MobileVoiceCaptureError,
    type MobileVoiceCaptureSession,
    startMobileVoiceCapture,
} from '@/services/voice/mobile-capture';
import { resolveVoiceComposerAvailability } from '@/services/voice-input/composer';
import { useVoiceInputDataSourceState } from '@/services/voice-input/data-source';
import { requireVoiceInputGatewayTarget } from '@/services/voice-input/gateway-target';
import {
    cancelMobileArtifactDownload,
    downloadAndShareMobileArtifact,
    mobileArtifactActionKey,
    openMobileArtifact,
    reduceMobileArtifactAction,
    type MobileArtifactActionEvent,
    type MobileArtifactActionState,
} from '@/services/artifacts/mobile-actions';
import { voiceInputPollInterval } from '@/services/voice-input/presentation';
import { fetchVoiceInputSettings, voiceInputQueryKeys } from '@/services/voice-input/query';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useGatewayStore } from '@/stores/gateway';
import { useThreadTreeStore } from '@/stores/thread-tree';
import { useWorkspaceStore } from '@/stores/workspace';

type ThreadScreenProps = {
    threadId: string;
    initialThread?: Thread | null;
};

const THREAD_COMPOSER_INPUT_NATIVE_ID = 'thread-composer-input';
const STICKY_KEYBOARD_OFFSET_CLOSED = 0;
const EMPTY_MCP_SERVER_ID_BY_NAME: Readonly<Record<string, string>> = {};
const EMPTY_SKILL_PICKER: ComposerSkillPickerProjection = { packs: [], standalone: [] };
const SEMANTIC_TURN_WORK_GROUP_PREFIX = 'semantic-turn-work-group::';
const EMPTY_SEMANTIC_WORK_RANGES: Readonly<Record<string, SemanticTurnWorkRange>> = {};
const VOICE_TURN_ID_LEN = 21;
const VOICE_TURN_ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
const generateVoiceTurnId = customAlphabet(VOICE_TURN_ID_ALPHABET, VOICE_TURN_ID_LEN);
const generateArtifactOperationId = customAlphabet(VOICE_TURN_ID_ALPHABET, VOICE_TURN_ID_LEN);

type ComposerModelSelection = {
    provider: string;
    model: string;
    selectedReasoningEffort: string | null;
};

type SemanticWorkRangesState = {
    threadId: string | null;
    ranges: Record<string, SemanticTurnWorkRange>;
};

type CliRuntimeSupportsSteerState = {
    workspaceId: string | null;
    runtimeId: string;
    supportsSteer: boolean | null;
};

type VoiceCommitPendingTurn = {
    threadId: string;
    turnId: string;
};

type GatewayVoiceStatusSnapshot = Readonly<{
    gatewayId: string;
    connectionId: number;
    response: VoiceStatusResponse;
}>;

const modelSelectionFromThread = (
    thread: Thread | null | undefined,
): ComposerModelSelection | null => {
    const provider = thread?.model_provider.trim();
    const model = thread?.model.trim();

    if (!provider || !model) {
        return null;
    }

    const selectedReasoningEffort = thread?.reasoning_effort?.trim() || null;

    return { provider, model, selectedReasoningEffort };
};

const ThreadScreen = ({ threadId, initialThread = null }: ThreadScreenProps) => {
    const { t } = useTranslation('threads');
    const { theme, rt } = useUnistyles();
    const queryClient = useQueryClient();

    const [focused, setFocused] = useState(false);

    const treeSnapshot = useThreadTreeStore((state) => state.snapshot);

    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const expandedKeys = useActiveThreadStore((state) => state.expandedKeys);

    const thread = treeSnapshot?.threads_by_id[threadId] ?? null;
    const activeThread = thread ?? initialThread ?? null;
    const { connectionId, connectionState } = useGateway();
    const voiceInputDataSource = useVoiceInputDataSourceState();
    const voiceInputTarget = voiceInputDataSource.target;
    const voiceInputSettingsQuery = useQuery<GatewaySettingsGetResponse>({
        queryKey: voiceInputTarget
            ? voiceInputQueryKeys.settings(voiceInputTarget)
            : [...voiceInputQueryKeys.all, 'composer-offline'],
        queryFn: voiceInputTarget ? () => fetchVoiceInputSettings(voiceInputTarget) : skipToken,
        refetchInterval: (query) =>
            voiceInputPollInterval(
                query.state.data?.settings.voice_input,
                Boolean(voiceInputTarget),
            ),
        refetchIntervalInBackground: false,
        refetchOnReconnect: true,
    });

    const {
        snapshot,
        loading,
        error,
        sending,
        turnCancelling,
        composerError,
        composerText,
        composerAttachments,
        composerCapabilities,
        composerSkillSelections,
        connected,
        canSend,
        hasInFlightTurn,
        canStopTurn,
        composerSelectedMode,
        composerSelectedProvider,
        composerSelectedModel,
        composerSelectedReasoningEffort,
        composerSelectedPermissionMode,
        defaultComposerSelectionLoading,
        composerModelManuallySelected,
        open,
        sendText,
        stopTurn,
        setComposerText,
        setComposerSkillSelections,
        setExpandedKeys,
    } = useActiveThread(activeThread, activeWorkspaceId, focused, threadId);

    const syncComposerModelSelection = useActiveThreadStore(
        (state) => state.syncComposerModelSelection,
    );
    const setComposerPermissionModeSwitcherOpen = useActiveThreadStore(
        (state) => state.setComposerPermissionModeSwitcherOpen,
    );
    const markComposerAttachmentsUploading = useActiveThreadStore(
        (state) => state.markComposerAttachmentsUploading,
    );
    const markComposerAttachmentsFailed = useActiveThreadStore(
        (state) => state.markComposerAttachmentsFailed,
    );
    const applyUploadedComposerAttachments = useActiveThreadStore(
        (state) => state.applyUploadedComposerAttachments,
    );
    const removeComposerAttachmentAt = useActiveThreadStore(
        (state) => state.removeComposerAttachmentAt,
    );
    const removeComposerCapability = useActiveThreadStore(
        (state) => state.removeComposerCapability,
    );
    const renderedComposerSubmissionPlan = useMemo(
        () =>
            composerSubmissionPlanForProvider(
                composerSelectedProvider,
                composerText,
                composerAttachments.length > 0,
                composerCapabilities,
            ),
        [composerAttachments.length, composerCapabilities, composerSelectedProvider, composerText],
    );
    const [composerSkillPicker, setComposerSkillPicker] =
        useState<ComposerSkillPickerProjection>(EMPTY_SKILL_PICKER);
    useEffect(() => {
        let cancelled = false;

        if (!focused || !connected || !activeWorkspaceId) {
            return () => {
                cancelled = true;
            };
        }

        void pioneerClient
            .composerSkillPackPicker({ workspace_id: activeWorkspaceId, query: '' })
            .then((picker) => {
                if (!cancelled) {
                    setComposerSkillPicker(picker);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setComposerSkillPicker(EMPTY_SKILL_PICKER);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [activeWorkspaceId, connected, focused]);
    const activeComposerSkillPicker =
        focused && connected && activeWorkspaceId ? composerSkillPicker : EMPTY_SKILL_PICKER;
    const composerSkillChips = useMemo(
        () =>
            pioneerClient.composerSkillChips({
                selections: composerSkillSelections,
                picker: activeComposerSkillPicker,
            }),
        [activeComposerSkillPicker, composerSkillSelections],
    );
    const timelineRef = useRef<LegendListRef>(null);
    const composerRef = useRef<View>(null);
    const [steering, setSteering] = useState(false);
    const [cliRuntimeThreadBinding, setCliRuntimeThreadBinding] =
        useState<CLIRuntimeThreadBinding | null>(null);
    const [activeCliRuntimeSupportsSteerLookup, setActiveCliRuntimeSupportsSteerLookup] =
        useState<CliRuntimeSupportsSteerState | null>(null);
    const [viewportPrefetchPlan, setViewportPrefetchPlan] =
        useState<TimelineViewportPrefetchPlan | null>(null);
    const [semanticWorkRangesState, setSemanticWorkRangesState] = useState<SemanticWorkRangesState>(
        {
            threadId: null,
            ranges: {},
        },
    );

    const [composerHeight, setComposerHeight] = useState(THREAD_COMPOSER_MIN_INPUT_HEIGHT);
    const [voiceStatusSnapshot, setVoiceStatusSnapshot] =
        useState<GatewayVoiceStatusSnapshot | null>(null);
    const [voiceLevel, setVoiceLevel] = useState(0);
    const [voiceCaptureBusy, setVoiceCaptureBusy] = useState(false);
    const [voiceCommitPendingTurn, setVoiceCommitPendingTurn] =
        useState<VoiceCommitPendingTurn | null>(null);
    const voiceMountedRef = useRef(true);
    const voiceSessionRef = useRef<MobileVoiceCaptureSession | null>(null);
    const voiceStartPromiseRef = useRef<Promise<MobileVoiceCaptureSession> | null>(null);
    const voiceReleaseIntentRef = useRef<'commit' | 'cancel' | null>(null);
    const voiceOwnedSessionIdsRef = useRef<Set<string>>(new Set());
    const voiceOwnedTurnIdsRef = useRef<Set<string>>(new Set());

    const keyboardOffset = rt.insets.bottom;
    const timelineContentBottomInset = composerHeight;

    const { contentInsetEndAdjustment, onComposerLayout } = useKeyboardChatComposerInset(
        timelineRef,
        composerRef,
        THREAD_COMPOSER_MIN_INPUT_HEIGHT,
    );

    const keyboardStickyOffset = useMemo(
        () => ({
            closed: STICKY_KEYBOARD_OFFSET_CLOSED,
            opened: keyboardOffset,
        }),
        [keyboardOffset],
    );
    const permissionModeOptions = useMemo(() => pioneerClient.composerPermissionModeOptions(), []);

    const visibleSnapshot = snapshot?.thread_id === threadId ? snapshot : null;
    const visibleThreadId = visibleSnapshot?.thread_id ?? threadId;
    const [artifactActionStateByKey, setArtifactActionStateByKey] = useState<
        Record<string, MobileArtifactActionState>
    >({});
    const artifactActionGenerationRef = useRef(0);
    const artifactActionGenerationByKeyRef = useRef(new Map<string, number>());
    const dispatchArtifactAction = useCallback(
        (
            workspaceId: string,
            artifactId: string,
            versionId: string | null,
            event: MobileArtifactActionEvent,
            generation?: number,
        ) => {
            const key = mobileArtifactActionKey(workspaceId, artifactId, versionId);
            if (
                generation !== undefined &&
                artifactActionGenerationByKeyRef.current.get(key) !== generation
            ) {
                return;
            }
            if (
                generation !== undefined &&
                (event.type === 'completed' || event.type === 'failed')
            ) {
                artifactActionGenerationByKeyRef.current.delete(key);
            }
            setArtifactActionStateByKey((current) => ({
                ...current,
                [key]: reduceMobileArtifactAction(current[key] ?? { kind: 'idle' }, event),
            }));
        },
        [],
    );
    const beginArtifactAction = useCallback(
        (
            workspaceId: string,
            artifactId: string,
            versionId: string | null,
        ): ((event: MobileArtifactActionEvent) => void) | null => {
            const key = mobileArtifactActionKey(workspaceId, artifactId, versionId);
            if (artifactActionGenerationByKeyRef.current.has(key)) {
                return null;
            }
            artifactActionGenerationRef.current += 1;
            const generation = artifactActionGenerationRef.current;
            artifactActionGenerationByKeyRef.current.set(key, generation);
            return (event) =>
                dispatchArtifactAction(workspaceId, artifactId, versionId, event, generation);
        },
        [dispatchArtifactAction],
    );
    const artifactWorkspaceId = visibleSnapshot?.workspace_id ?? activeWorkspaceId;
    const handleOpenArtifact = useCallback(
        (artifactId: string, versionId: string | null = null) => {
            if (!artifactWorkspaceId || !connected) {
                dispatchArtifactAction(artifactWorkspaceId ?? '', artifactId, versionId, {
                    type: 'failed',
                    code: 'reconfiguration_required',
                });
                return;
            }
            const dispatch = beginArtifactAction(artifactWorkspaceId, artifactId, versionId);
            if (!dispatch) {
                return;
            }
            void openMobileArtifact(
                { workspaceId: artifactWorkspaceId, artifactId, versionId },
                dispatch,
            );
        },
        [artifactWorkspaceId, beginArtifactAction, connected, dispatchArtifactAction],
    );
    const handleShareArtifact = useCallback(
        (artifactId: string, versionId: string | null = null) => {
            if (!artifactWorkspaceId || !connected) {
                dispatchArtifactAction(artifactWorkspaceId ?? '', artifactId, versionId, {
                    type: 'failed',
                    code: 'reconfiguration_required',
                });
                return;
            }
            const dispatch = beginArtifactAction(artifactWorkspaceId, artifactId, versionId);
            if (!dispatch) {
                return;
            }
            void downloadAndShareMobileArtifact(
                { workspaceId: artifactWorkspaceId, artifactId, versionId },
                `artifact-${generateArtifactOperationId()}`,
                dispatch,
            );
        },
        [artifactWorkspaceId, beginArtifactAction, connected, dispatchArtifactAction],
    );
    const handleCancelArtifactDownload = useCallback(
        (artifactId: string, versionId: string | null, operationId: string) => {
            if (!artifactWorkspaceId) {
                return;
            }
            const key = mobileArtifactActionKey(artifactWorkspaceId, artifactId, versionId);
            const generation = artifactActionGenerationByKeyRef.current.get(key);
            if (generation === undefined) {
                return;
            }
            void cancelMobileArtifactDownload(operationId, (event) => {
                dispatchArtifactAction(
                    artifactWorkspaceId,
                    artifactId,
                    versionId,
                    event,
                    generation,
                );
            });
        },
        [artifactWorkspaceId, dispatchArtifactAction],
    );
    const [composerMeasurement, setComposerMeasurement] = useState<{
        threadId: string;
        measured: boolean;
    } | null>(null);
    const composerMeasured =
        composerMeasurement?.threadId === visibleThreadId && composerMeasurement.measured;
    const isLiveDraftThread = Boolean(
        visibleSnapshot?.draft_thread_id && visibleSnapshot.draft_thread_id === visibleThreadId,
    );
    const timelineIdentityKey = visibleThreadId;
    const visibleTurnId = visibleSnapshot?.projection.in_flight_turn_id ?? null;
    const semanticWorkRangesByTurn =
        semanticWorkRangesState.threadId === visibleThreadId
            ? semanticWorkRangesState.ranges
            : EMPTY_SEMANTIC_WORK_RANGES;
    const nativeSemanticWorkItemKeys = useMemo(() => {
        const keys = new Set<string>();
        for (const range of Object.values(semanticWorkRangesByTurn)) {
            for (const item of range.items) {
                keys.add(item.workItemId);
            }
        }
        return keys;
    }, [semanticWorkRangesByTurn]);

    useTimelineQueryCancellation(visibleThreadId, focused);
    useTimelineReconnectInvalidation(visibleThreadId, focused);

    useEffect(() => {
        if (!isLiveDraftThread || !visibleSnapshot?.workspace_id) {
            return;
        }

        seedEmptyThreadTimelineCache(queryClient, visibleSnapshot.workspace_id, visibleThreadId);
    }, [isLiveDraftThread, queryClient, visibleSnapshot?.workspace_id, visibleThreadId]);

    const threadTimelineBlocksQuery = useThreadTimelineBlocksQuery({
        threadId: visibleThreadId,
        enabled: focused && connected && !isLiveDraftThread,
    });
    const { refetch: refetchThreadTimelineBlocks } = threadTimelineBlocksQuery;
    const threadTimelineBlocksQueryRef = useRef(threadTimelineBlocksQuery);
    useEffect(() => {
        threadTimelineBlocksQueryRef.current = threadTimelineBlocksQuery;
    }, [threadTimelineBlocksQuery]);
    const refreshNativeActiveThreadSnapshot = useCallback(() => {
        const nextSnapshot = activeThreadSnapshot({
            expanded_keys: useActiveThreadStore.getState().expandedKeys,
        });
        if (nextSnapshot.thread_id !== visibleThreadId) {
            return;
        }

        cacheActiveThreadSnapshot(queryClient, nextSnapshot);
    }, [queryClient, visibleThreadId]);
    useEffect(() => {
        if (
            !focused ||
            !connected ||
            isLiveDraftThread ||
            !threadTimelineBlocksQuery.hasLoadedPage
        ) {
            return;
        }

        refreshNativeActiveThreadSnapshot();
    }, [
        connected,
        focused,
        isLiveDraftThread,
        refreshNativeActiveThreadSnapshot,
        threadTimelineBlocksQuery.hasLoadedPage,
        threadTimelineBlocksQuery.pages,
    ]);
    const semanticTurnWorkQueryTargets = useMemo(
        () =>
            activeSemanticTurnWorkQueryTargets(
                threadTimelineBlocksQuery.blocks,
                expandedKeys,
                visibleTurnId,
                visibleSnapshot,
            ),
        [expandedKeys, threadTimelineBlocksQuery.blocks, visibleSnapshot, visibleTurnId],
    );
    const semanticTimelineRows = useMemo(
        () =>
            visibleSnapshot && threadTimelineBlocksQuery.hasLoadedPage
                ? projectSemanticTimelineToRows({
                      snapshot: visibleSnapshot,
                      blocks: threadTimelineBlocksQuery.blocks,
                      expandedKeys,
                      workRangesByTurn: semanticWorkRangesByTurn,
                  })
                : null,
        [
            expandedKeys,
            semanticWorkRangesByTurn,
            threadTimelineBlocksQuery.blocks,
            threadTimelineBlocksQuery.hasLoadedPage,
            visibleSnapshot,
        ],
    );
    const hasNativeTimelineRows = Boolean((visibleSnapshot?.rows.length ?? 0) > 0);
    const timelineRowsOverride = useMemo(
        () => (hasNativeTimelineRows ? null : (semanticTimelineRows ?? [])),
        [hasNativeTimelineRows, semanticTimelineRows],
    );
    const semanticPendingRequests = useMemo<TimelinePendingRequest[]>(
        () =>
            (semanticTimelineRows ?? []).flatMap((row) =>
                'type' in row && row.type === 'pending-request' ? [row.entry] : [],
            ),
        [semanticTimelineRows],
    );
    const renderedTimelineRowsForVoice = useMemo<TimelineRow[]>(() => {
        if (!visibleSnapshot) {
            return [];
        }

        return hasNativeTimelineRows
            ? projectConversationToRows(visibleSnapshot)
            : (timelineRowsOverride ?? []);
    }, [hasNativeTimelineRows, timelineRowsOverride, visibleSnapshot]);
    const voiceCommitPendingTurnId =
        voiceCommitPendingTurn?.threadId === visibleThreadId ? voiceCommitPendingTurn.turnId : null;
    const voiceCommitUserMessageVisible = useMemo(() => {
        if (!voiceCommitPendingTurnId) {
            return false;
        }

        return renderedTimelineRowsForVoice.some(
            (row) => row.type === 'user-message' && row.turnId === voiceCommitPendingTurnId,
        );
    }, [renderedTimelineRowsForVoice, voiceCommitPendingTurnId]);
    const voiceCommitProcessing = Boolean(
        voiceCommitPendingTurnId && !voiceCommitUserMessageVisible,
    );

    const closed = Boolean(
        visibleSnapshot?.thread?.status === 'Closed' || activeThread?.status === 'Closed',
    );

    const waitingForSnapshot = loading || (connectionState === 'Connected' && !error);

    const semanticTimelineError =
        threadTimelineBlocksQuery.error instanceof Error
            ? threadTimelineBlocksQuery.error.message
            : null;
    const screenError = error ?? semanticTimelineError;

    const waitingForInitialTimelinePage = Boolean(
        visibleSnapshot &&
        !hasNativeTimelineRows &&
        !isLiveDraftThread &&
        !threadTimelineBlocksQuery.hasLoadedPage &&
        threadTimelineBlocksQuery.isLoading &&
        !screenError,
    );
    const showThreadLoader = Boolean(
        (!visibleSnapshot && waitingForSnapshot) || waitingForInitialTimelinePage,
    );
    const contentTopInset = theme.screenContentPadding('child').paddingTop;

    const activeThreadModelSelection = useMemo(() => {
        const activeThreadSnapshot = visibleSnapshot?.thread ?? activeThread;

        return modelSelectionFromThread(activeThreadSnapshot);
    }, [activeThread, visibleSnapshot]);

    const activeThreadModelProvider = activeThreadModelSelection?.provider ?? null;
    const activeThreadModel = activeThreadModelSelection?.model ?? null;
    const activeThreadReasoningEffort = activeThreadModelSelection?.selectedReasoningEffort ?? null;
    const shouldUseThreadModelSelection =
        Boolean(activeThreadModelSelection) && !composerModelManuallySelected && !isLiveDraftThread;
    const shouldUseDraftComposerSelection = isLiveDraftThread && !composerModelManuallySelected;
    const selectedProvider = shouldUseThreadModelSelection
        ? activeThreadModelProvider
        : composerModelManuallySelected || shouldUseDraftComposerSelection
          ? composerSelectedProvider
          : null;
    const selectedModel = shouldUseThreadModelSelection
        ? activeThreadModel
        : composerModelManuallySelected || shouldUseDraftComposerSelection
          ? composerSelectedModel
          : null;
    const modelSelectionComplete = Boolean(selectedProvider && selectedModel);
    const selectedReasoningEffort = shouldUseThreadModelSelection
        ? activeThreadReasoningEffort
        : composerModelManuallySelected || shouldUseDraftComposerSelection
          ? composerSelectedReasoningEffort
          : null;
    const { label: selectedModelDisplayName, loading: modelDisplayNameLoading } =
        useProviderModelDisplayName(activeWorkspaceId, selectedProvider, selectedModel);
    const { label: selectedReasoningEffortLabel, loading: reasoningEffortLabelLoading } =
        useProviderModelReasoningEffortLabel(
            activeWorkspaceId,
            selectedProvider,
            selectedModel,
            selectedReasoningEffort,
        );
    const modelSelectionLoading =
        modelDisplayNameLoading ||
        (shouldUseDraftComposerSelection &&
            defaultComposerSelectionLoading &&
            (!selectedProvider || !selectedModel));
    const modelSelectionLabel = selectedModelDisplayName ?? t('modelSelectorSelectModel');
    const modelSelectionEffortLabel =
        modelSelectionLoading || reasoningEffortLabelLoading ? null : selectedReasoningEffortLabel;
    const composerDisabled = Boolean(
        !connected || closed || visibleSnapshot?.projection.composer_locked || sending,
    );
    const modelSelectionDisabled = Boolean(sending);
    const voiceStatusResponse =
        voiceInputTarget &&
        voiceStatusSnapshot?.gatewayId === voiceInputTarget.gatewayId &&
        voiceStatusSnapshot.connectionId === voiceInputTarget.connectionId
            ? voiceStatusSnapshot.response
            : null;
    const voiceStatus = voiceStatusResponse?.status ?? null;
    const voiceAvailability = resolveVoiceComposerAvailability({
        online: voiceInputDataSource.kind === 'online',
        settingsLoading: voiceInputSettingsQuery.isPending,
        settingsError: voiceInputSettingsQuery.isError,
        settings: voiceInputSettingsQuery.data?.settings.voice_input,
        voiceStatus,
    });
    const voiceReady = voiceAvailability.kind === 'ready';
    const voiceVisible = voiceReady;
    const voiceEnabled = Boolean(
        !composerDisabled &&
        !voiceCommitProcessing &&
        !hasInFlightTurn &&
        modelSelectionComplete &&
        activeWorkspaceId &&
        visibleThreadId &&
        voiceReady,
    );

    const pendingRequests = useMemo(() => {
        const byRequestId = new Map<string, TimelinePendingRequest>();

        for (const request of visibleSnapshot?.pending_requests ?? []) {
            byRequestId.set(request.request_id, {
                thread_id: request.thread_id ?? null,
                turn_id: request.turn_id ?? null,
                request,
            });
        }

        for (const request of semanticPendingRequests) {
            if (!byRequestId.has(request.request.request_id)) {
                byRequestId.set(request.request.request_id, request);
            }
        }

        return Array.from(byRequestId.values());
    }, [semanticPendingRequests, visibleSnapshot?.pending_requests]);
    const activeCliRuntimeThreadBinding =
        cliRuntimeThreadBinding?.workspace_id === activeWorkspaceId &&
        cliRuntimeThreadBinding.thread_id === visibleThreadId
            ? cliRuntimeThreadBinding
            : null;
    const activeCliRuntimeId = activeCliRuntimeThreadBinding?.runtime_id ?? null;
    const activeCliRuntimeSupportsSteer =
        activeCliRuntimeSupportsSteerLookup?.workspaceId === activeWorkspaceId &&
        activeCliRuntimeSupportsSteerLookup.runtimeId === activeCliRuntimeId
            ? activeCliRuntimeSupportsSteerLookup.supportsSteer
            : null;
    const activeCliRuntimeCanSteer = activeCliRuntimeSupportsSteer ?? false;
    const canSteerCliRuntimeTurn = Boolean(
        connected &&
        activeCliRuntimeThreadBinding &&
        activeCliRuntimeCanSteer &&
        visibleThreadId &&
        visibleTurnId &&
        composerText.trim().length > 0 &&
        composerAttachments.length === 0 &&
        composerCapabilities.length === 0 &&
        composerSkillSelections.length === 0,
    );

    useFocusEffect(
        useCallback(() => {
            setFocused(true);
            if (!isLiveDraftThread && threadTimelineBlocksQueryRef.current.hasLoadedPage) {
                void threadTimelineBlocksQueryRef.current.refetch();
            }

            return () => {
                setFocused(false);
            };
        }, [isLiveDraftThread]),
    );

    useEffect(() => {
        return () => {
            voiceMountedRef.current = false;
            voiceReleaseIntentRef.current = 'cancel';
            const session = voiceSessionRef.current;
            voiceSessionRef.current = null;
            if (session) {
                void session.cancel('mobile_screen_unmounted').catch(() => null);
            }
        };
    }, []);

    const updateComposerHeight = useCallback((height: number) => {
        const nextHeight = Math.max(height, THREAD_COMPOSER_MIN_INPUT_HEIGHT);

        setComposerHeight((currentHeight: number) =>
            Math.abs(currentHeight - nextHeight) < 1 ? currentHeight : nextHeight,
        );
    }, []);

    const handleComposerAreaLayout = useCallback(
        (event: LayoutChangeEvent) => {
            onComposerLayout(event);
            updateComposerHeight(event.nativeEvent.layout.height);
            setComposerMeasurement({ threadId: visibleThreadId, measured: true });
        },
        [onComposerLayout, updateComposerHeight, visibleThreadId],
    );

    const refreshThreadTimeline = useCallback(async () => {
        await open();
        if (!isLiveDraftThread) {
            await refetchThreadTimelineBlocks();
        }
    }, [isLiveDraftThread, open, refetchThreadTimelineBlocks]);

    const refreshVoiceStatus = useCallback(async () => {
        if (!connected || !activeWorkspaceId || !voiceInputTarget) {
            setVoiceStatusSnapshot(null);
            return;
        }

        const requestTarget = voiceInputTarget;
        try {
            const response = await pioneerClient.voiceStatus({ workspace_id: activeWorkspaceId });
            requireVoiceInputGatewayTarget(requestTarget);
            if (voiceMountedRef.current) {
                setVoiceStatusSnapshot({
                    gatewayId: requestTarget.gatewayId,
                    connectionId: requestTarget.connectionId,
                    response,
                });
            }
        } catch {
            if (voiceMountedRef.current) {
                setVoiceStatusSnapshot((current) =>
                    current?.gatewayId === requestTarget.gatewayId &&
                    current.connectionId === requestTarget.connectionId
                        ? null
                        : current,
                );
            }
        }
    }, [activeWorkspaceId, connected, voiceInputTarget]);

    useEffect(() => {
        let cancelled = false;

        if (!focused || !connected || !activeWorkspaceId) {
            return () => {
                cancelled = true;
            };
        }

        const load = async () => {
            if (voiceSessionRef.current || voiceStartPromiseRef.current || voiceCaptureBusy) {
                return;
            }

            await refreshVoiceStatus();
            if (cancelled) {
                return;
            }
        };

        void load();
        const intervalId = setInterval(load, 15_000);

        return () => {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, [activeWorkspaceId, connected, connectionId, focused, refreshVoiceStatus, voiceCaptureBusy]);

    const handleTurnWorkRangeChange = useCallback(
        (turnId: string, range: SemanticTurnWorkRange | null) => {
            setSemanticWorkRangesState((current) => {
                const currentRanges =
                    current.threadId === visibleThreadId
                        ? current.ranges
                        : EMPTY_SEMANTIC_WORK_RANGES;

                if (range === null) {
                    if (!(turnId in currentRanges)) {
                        return current;
                    }

                    const next = { ...currentRanges };
                    delete next[turnId];
                    return {
                        threadId: visibleThreadId,
                        ranges: next,
                    };
                }

                if (current.threadId === visibleThreadId && currentRanges[turnId] === range) {
                    return current;
                }

                return {
                    threadId: visibleThreadId,
                    ranges: {
                        ...currentRanges,
                        [turnId]: range,
                    },
                };
            });
        },
        [visibleThreadId],
    );

    const handleViewportPrefetchPlanChange = useCallback((plan: TimelineViewportPrefetchPlan) => {
        setViewportPrefetchPlan(plan);

        const query = threadTimelineBlocksQueryRef.current;
        if (plan.nearStart && query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
        }
        if (plan.nearEnd && query.hasPreviousPage && !query.isFetchingPreviousPage) {
            void query.fetchPreviousPage();
        }
    }, []);

    const handleOpenTaskThread = useCallback(
        (row: Extract<TimelineRow, { type: 'task-anchor' }>) => {
            if (!row.childThreadId || !visibleThreadId) {
                return;
            }

            router.push({
                pathname: '/thread/child/[threadId]',
                params: {
                    threadId: row.childThreadId,
                    parentThreadId: visibleThreadId,
                    taskTitle: row.title,
                },
            });
        },
        [visibleThreadId],
    );

    const handleSend = useCallback(() => {
        if (
            !renderedComposerSubmissionPlan.has_composer_payload &&
            composerSkillSelections.length === 0
        ) {
            return;
        }

        void sendText(composerText, activeComposerSkillPicker).then((sent) => {
            if (sent) {
                setComposerText('');
            }
        });
    }, [
        composerText,
        activeComposerSkillPicker,
        composerSkillSelections.length,
        renderedComposerSubmissionPlan.has_composer_payload,
        sendText,
        setComposerText,
    ]);

    const voiceComposerErrorMessage = useCallback(
        (captureError: unknown): string => {
            if (captureError instanceof MobileVoiceCaptureError) {
                switch (captureError.code) {
                    case 'permission_denied':
                        return t('voicePermissionDenied');
                    case 'device_unavailable':
                        return t('voiceDeviceUnavailable');
                    case 'voice_not_ready':
                        return captureError.message || t('voiceNotReady');
                    case 'chunk_send_failed':
                    case 'session_start_failed':
                    case 'recorder_start_failed':
                    case 'finalize_failed':
                    case 'cancel_failed':
                        return captureError.message || t('voiceFailed');
                }
            }

            return captureError instanceof Error && captureError.message.trim()
                ? captureError.message
                : t('voiceFailed');
        },
        [t],
    );

    const prepareVoiceContext = useCallback(
        async (scope: VoiceSessionStartContext): Promise<VoiceTurnContext> => {
            const storeState = useActiveThreadStore.getState();
            const hasCompleteComposerModelSelection = Boolean(
                storeState.composerSelectedProvider && storeState.composerSelectedModel,
            );
            const selectedProviderForVoice = hasCompleteComposerModelSelection
                ? storeState.composerSelectedProvider
                : null;
            const selectedModelForVoice = hasCompleteComposerModelSelection
                ? storeState.composerSelectedModel
                : null;
            const selectedReasoningEffortForVoice = hasCompleteComposerModelSelection
                ? storeState.composerSelectedReasoningEffort
                : null;

            const attachments = storeState.composerAttachments;
            const submissionPlan = composerSubmissionPlanForProvider(
                selectedProviderForVoice,
                '',
                storeState.composerAttachments.length > 0,
                storeState.composerCapabilities,
            );
            const attachmentsForVoice =
                attachments.length > 0 ? markComposerAttachmentsUploading() : attachments;

            try {
                const snapshot = await pioneerClient.prepareVoiceComposerSnapshot({
                    thread_id: scope.thread_id,
                    workspace_id: scope.workspace_id,
                    turn_id: scope.turn_id,
                    selected_model: selectedModelForVoice,
                    selected_provider: selectedProviderForVoice,
                    ...selectedReasoningEffortRequestFields(selectedReasoningEffortForVoice),
                    selected_mode: composerSelectedMode,
                    permission_mode: composerSelectedPermissionMode,
                    attachments: attachmentsForVoice,
                    capabilities: submissionPlan.capabilities,
                    ...skillSelectionRequestFields(
                        storeState.composerSkillSelections,
                        activeComposerSkillPicker,
                    ),
                });

                applyUploadedComposerAttachments(snapshot.uploaded_attachment_artifacts);

                return snapshot.context;
            } catch (prepareError) {
                if (attachmentsForVoice.length > 0) {
                    const message = voiceComposerErrorMessage(prepareError);
                    markComposerAttachmentsFailed(message);
                }
                throw prepareError;
            }
        },
        [
            applyUploadedComposerAttachments,
            activeComposerSkillPicker,
            composerSelectedMode,
            composerSelectedPermissionMode,
            markComposerAttachmentsFailed,
            markComposerAttachmentsUploading,
            voiceComposerErrorMessage,
        ],
    );

    const finishVoiceCapture = useCallback(
        (intent: 'commit' | 'cancel') => {
            const session = voiceSessionRef.current;
            if (!session) {
                if (voiceStartPromiseRef.current) {
                    voiceReleaseIntentRef.current = intent;
                }
                return;
            }

            voiceSessionRef.current = null;
            voiceReleaseIntentRef.current = null;
            setVoiceCaptureBusy(true);
            if (intent === 'commit') {
                setVoiceCommitPendingTurn({
                    threadId: visibleThreadId,
                    turnId: session.turnId,
                });
            }

            const operation =
                intent === 'commit'
                    ? session.commit(() => prepareVoiceContext(session.startContext))
                    : session.cancel('mobile_release_cancel');

            void operation
                .then(() => undefined)
                .catch((captureError) => {
                    if (voiceMountedRef.current) {
                        if (intent === 'commit') {
                            setVoiceCommitPendingTurn(null);
                        }
                        useActiveThreadStore
                            .getState()
                            .setComposerError(voiceComposerErrorMessage(captureError));
                    }
                })
                .finally(() => {
                    if (!voiceMountedRef.current) {
                        return;
                    }

                    setVoiceCaptureBusy(false);
                    setVoiceLevel(0);
                    void refreshVoiceStatus();
                });
        },
        [refreshVoiceStatus, prepareVoiceContext, visibleThreadId, voiceComposerErrorMessage],
    );

    const handleVoiceStart = useCallback(() => {
        if (
            voiceStartPromiseRef.current ||
            voiceSessionRef.current ||
            voiceCaptureBusy ||
            !activeWorkspaceId ||
            !visibleThreadId ||
            !voiceEnabled
        ) {
            return;
        }

        const storeState = useActiveThreadStore.getState();
        if (
            storeState.composerModelManuallySelected &&
            (!storeState.composerSelectedProvider || !storeState.composerSelectedModel)
        ) {
            storeState.setComposerError(t('modelSelectionRequired'));
            return;
        }

        storeState.setComposerError(null);
        setVoiceLevel(0);
        setVoiceCaptureBusy(true);
        setVoiceCommitPendingTurn(null);
        voiceReleaseIntentRef.current = null;
        const turnId = generateVoiceTurnId();

        const startPromise = startMobileVoiceCapture({
            workspaceId: activeWorkspaceId,
            startContext: {
                workspace_id: activeWorkspaceId,
                thread_id: visibleThreadId,
                turn_id: turnId,
            },
            callbacks: {
                onLevel: (level) => {
                    if (voiceMountedRef.current) {
                        setVoiceLevel(level);
                    }
                },
                onError: (captureError) => {
                    if (voiceMountedRef.current) {
                        useActiveThreadStore
                            .getState()
                            .setComposerError(voiceComposerErrorMessage(captureError));
                    }
                },
            },
        });
        voiceStartPromiseRef.current = startPromise;

        void startPromise
            .then((session) => {
                if (!voiceMountedRef.current) {
                    void session.cancel('mobile_screen_unmounted').catch(() => null);
                    return;
                }

                voiceStartPromiseRef.current = null;
                voiceSessionRef.current = session;
                voiceOwnedSessionIdsRef.current.add(session.sessionId);
                voiceOwnedTurnIdsRef.current.add(session.turnId);
                setVoiceCaptureBusy(false);

                const releaseIntent = voiceReleaseIntentRef.current;
                if (releaseIntent) {
                    finishVoiceCapture(releaseIntent);
                }
            })
            .catch((captureError) => {
                if (!voiceMountedRef.current) {
                    return;
                }

                voiceStartPromiseRef.current = null;
                voiceReleaseIntentRef.current = null;
                setVoiceCaptureBusy(false);
                setVoiceLevel(0);
                useActiveThreadStore
                    .getState()
                    .setComposerError(voiceComposerErrorMessage(captureError));
                void refreshVoiceStatus();
            });
    }, [
        activeWorkspaceId,
        finishVoiceCapture,
        refreshVoiceStatus,
        t,
        visibleThreadId,
        voiceCaptureBusy,
        voiceComposerErrorMessage,
        voiceEnabled,
    ]);

    const handleVoiceCommit = useCallback(() => {
        finishVoiceCapture('commit');
    }, [finishVoiceCapture]);

    const handleVoiceCancel = useCallback(() => {
        finishVoiceCapture('cancel');
    }, [finishVoiceCapture]);

    const voiceSessionResultReductionMessage = useCallback(
        (reduction: VoiceSessionResultReduction): string => {
            if (reduction.action === 'show_no_speech_error') {
                return reduction.error?.message || t('voiceNoSpeech');
            }

            return reduction.error?.message || t('voiceTranscriptionFailed');
        },
        [t],
    );

    useEffect(() => {
        if (!focused) {
            return;
        }

        return useGatewayStore.subscribe((state, previousState) => {
            if (state.lastEventSerial === previousState.lastEventSerial) {
                return;
            }

            const event = state.lastEvent;
            if (!event) {
                return;
            }

            if ('GatewayNotification' in event) {
                const notification = event.GatewayNotification;
                if (notification.kind !== 'turn_started') {
                    return;
                }

                const turnId = notification.params.turn.id;
                if (!voiceOwnedTurnIdsRef.current.delete(turnId)) {
                    return;
                }
                useActiveThreadStore.getState().clearComposerPayload();
                return;
            }

            if (!('VoiceSessionResultReduced' in event)) {
                return;
            }

            const reduction = event.VoiceSessionResultReduced;
            if (!voiceOwnedSessionIdsRef.current.has(reduction.session_id)) {
                return;
            }

            voiceOwnedSessionIdsRef.current.delete(reduction.session_id);
            if (reduction.turn_id) {
                voiceOwnedTurnIdsRef.current.delete(reduction.turn_id);
            }
            void refreshVoiceStatus();

            if (reduction.action === 'clear_finalizing') {
                if (reduction.outcome !== 'turn_started') {
                    setVoiceCommitPendingTurn(null);
                    return;
                }
                useActiveThreadStore.getState().clearComposerPayload();
                return;
            }

            if (
                reduction.action === 'show_no_speech_error' ||
                reduction.action === 'show_finalize_error'
            ) {
                setVoiceCommitPendingTurn(null);
                useActiveThreadStore
                    .getState()
                    .setComposerError(voiceSessionResultReductionMessage(reduction));
            }
        });
    }, [focused, refreshVoiceStatus, voiceSessionResultReductionMessage]);

    const handleStopTurn = useCallback(() => {
        void stopTurn();
    }, [stopTurn]);

    const handleSteerTurn = useCallback(() => {
        const message = composerText.trim();

        if (
            !message ||
            !activeWorkspaceId ||
            !visibleThreadId ||
            !visibleTurnId ||
            !activeCliRuntimeThreadBinding
        ) {
            return;
        }

        setSteering(true);
        useActiveThreadStore.getState().setComposerError(null);

        void pioneerClient
            .cliRuntimeTurnSteer({
                workspace_id: activeWorkspaceId,
                runtime_id: activeCliRuntimeThreadBinding.runtime_id,
                thread_id: visibleThreadId,
                turn_id: visibleTurnId,
                message,
            })
            .then(() => {
                setComposerText('');
            })
            .catch((steerError) => {
                useActiveThreadStore.getState().setComposerError(errorMessage(steerError));
            })
            .finally(() => {
                setSteering(false);
            });
    }, [
        activeCliRuntimeThreadBinding,
        activeWorkspaceId,
        composerText,
        setComposerText,
        visibleThreadId,
        visibleTurnId,
    ]);

    const openModelSelector = useCallback(() => {
        if (selectedProvider && selectedModel) {
            useActiveThreadStore
                .getState()
                .syncComposerModelSelection(
                    selectedProvider,
                    selectedModel,
                    selectedReasoningEffort,
                );
        }

        router.push({ pathname: '/model-selector' });
    }, [selectedModel, selectedProvider, selectedReasoningEffort]);

    const openAttachmentMenu = useCallback(() => {
        useActiveThreadStore.getState().setComposerAttachmentMenuOpen(true);
    }, []);

    const openPermissionModeSelector = useCallback(() => {
        setComposerPermissionModeSwitcherOpen(true);
    }, [setComposerPermissionModeSwitcherOpen]);

    const removeAttachment = useCallback(
        (index: number) => {
            removeComposerAttachmentAt(index);
        },
        [removeComposerAttachmentAt],
    );

    const removeCapability = useCallback(
        (index: number) => {
            const capability = renderedComposerSubmissionPlan.capabilities[index];
            if (!capability) {
                return;
            }
            removeComposerCapability(capability.id);
        },
        [removeComposerCapability, renderedComposerSubmissionPlan.capabilities],
    );

    const removeSkillChip = useCallback(
        (chip: ComposerSkillChip) => {
            let selection: ComposerSkillSelection | null = null;
            if (chip.kind === 'skill_pack' && chip.pack_id) {
                selection = { kind: 'skill_pack', pack_id: chip.pack_id };
            } else if (chip.skill_id) {
                selection = {
                    kind: 'skill',
                    skill_id: chip.skill_id,
                    pack_id: chip.kind === 'packed_skill' ? (chip.pack_id ?? null) : null,
                };
            }
            if (!selection) {
                return;
            }

            const result = pioneerClient.composerSkillSelectionToggle({
                selections: useActiveThreadStore.getState().composerSkillSelections,
                picker: activeComposerSkillPicker,
                selection,
            });
            setComposerSkillSelections(result.selections);
        },
        [activeComposerSkillPicker, setComposerSkillSelections],
    );

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;

            if (isLiveDraftThread) {
                return () => {
                    cancelled = true;
                };
            }

            if (!activeThreadModelProvider || !activeThreadModel) {
                return () => {
                    cancelled = true;
                };
            }

            if (!isCliRuntimeProvider(activeThreadModelProvider)) {
                syncComposerModelSelection(
                    activeThreadModelProvider,
                    activeThreadModel,
                    activeThreadReasoningEffort,
                    NATIVE_COMPOSER_CAPABILITY_POLICY,
                );
            } else if (activeWorkspaceId) {
                void refreshCliRuntimeSummaries(activeWorkspaceId)
                    .then((runtimes) => {
                        if (!cancelled) {
                            syncComposerModelSelection(
                                activeThreadModelProvider,
                                activeThreadModel,
                                activeThreadReasoningEffort,
                                composerCapabilityTargetForProvider(
                                    activeThreadModelProvider,
                                    runtimes,
                                ),
                            );
                        }
                    })
                    .catch(() => {
                        if (!cancelled) {
                            syncComposerModelSelection(
                                activeThreadModelProvider,
                                activeThreadModel,
                                activeThreadReasoningEffort,
                                UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
                            );
                        }
                    });
            } else {
                syncComposerModelSelection(
                    activeThreadModelProvider,
                    activeThreadModel,
                    activeThreadReasoningEffort,
                    UNSUPPORTED_CLI_COMPOSER_CAPABILITY_POLICY,
                );
            }

            return () => {
                cancelled = true;
            };
        }, [
            activeThreadModel,
            activeThreadModelProvider,
            activeThreadReasoningEffort,
            activeWorkspaceId,
            isLiveDraftThread,
            syncComposerModelSelection,
        ]),
    );

    useEffect(() => {
        let cancelled = false;

        if (!connected || !activeWorkspaceId || !visibleThreadId) {
            return () => {
                cancelled = true;
            };
        }

        void pioneerClient
            .cliRuntimeThreadBindingGet({
                workspace_id: activeWorkspaceId,
                thread_id: visibleThreadId,
            })
            .then((response) => {
                if (cancelled) {
                    return;
                }

                const binding = response.binding ?? null;
                setCliRuntimeThreadBinding(binding);
            })
            .catch(() => {
                if (!cancelled) {
                    setCliRuntimeThreadBinding(null);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [activeWorkspaceId, connected, visibleThreadId, visibleTurnId]);

    useEffect(() => {
        let cancelled = false;

        if (!connected || !activeWorkspaceId || !activeCliRuntimeId) {
            return () => {
                cancelled = true;
            };
        }

        void pioneerClient
            .cliRuntimeList({ workspace_id: activeWorkspaceId })
            .then((response) => {
                if (cancelled) {
                    return;
                }

                const runtime = response.runtimes.find(
                    (item) => item.runtime_id === activeCliRuntimeId,
                );
                setActiveCliRuntimeSupportsSteerLookup({
                    workspaceId: activeWorkspaceId,
                    runtimeId: activeCliRuntimeId,
                    supportsSteer: runtime?.capabilities.supports_steer ?? null,
                });
            })
            .catch(() => {
                if (!cancelled) {
                    setActiveCliRuntimeSupportsSteerLookup({
                        workspaceId: activeWorkspaceId,
                        runtimeId: activeCliRuntimeId,
                        supportsSteer: null,
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [activeCliRuntimeId, activeWorkspaceId, connected, connectionId]);

    if (!activeThread && !visibleSnapshot && !treeSnapshot) {
        return <ThreadState loading label={t('loadingThread')} />;
    }

    if (!activeThread && !visibleSnapshot && !loading) {
        return <ThreadState label={t('invalidThread')} />;
    }

    return (
        <View style={styles.container}>
            {semanticTurnWorkQueryTargets.map((target) => (
                <TurnWorkItemsQueryBridge
                    key={target.work.turnId}
                    threadId={visibleThreadId}
                    enabled={focused && connected && !isLiveDraftThread}
                    expanded={target.expanded}
                    liveVisible={target.liveVisible}
                    boundaryHint={viewportPrefetchPlan?.turnWork[target.work.turnId] ?? null}
                    onRangeChange={handleTurnWorkRangeChange}
                    onNativeSnapshotRefresh={refreshNativeActiveThreadSnapshot}
                    work={target.work}
                />
            ))}
            <KeyboardGestureArea
                interpolator="ios"
                offset={composerHeight}
                style={styles.keyboardWrap}
                textInputNativeID={THREAD_COMPOSER_INPUT_NATIVE_ID}
            >
                <View style={styles.threadWrap}>
                    {showThreadLoader ? (
                        <ThreadState
                            loading
                            label={t('loadingThread')}
                            color={theme.colors.typography}
                        />
                    ) : visibleSnapshot ? (
                        <ThreadTimeline
                            ref={timelineRef}
                            conversation={visibleSnapshot}
                            timelineIdentityKey={timelineIdentityKey}
                            rowsOverride={timelineRowsOverride}
                            loading={false}
                            closed={closed}
                            connected={connected}
                            emptyLabel={t('threadEmpty')}
                            closedLabel={t('threadClosed')}
                            disconnectedLabel={t('disconnected')}
                            loadingLabel={t('loadingThread')}
                            pendingRequests={pendingRequests}
                            semanticWorkItemKeys={nativeSemanticWorkItemKeys}
                            contentTopInset={contentTopInset}
                            contentBottomInset={timelineContentBottomInset}
                            emptyReady={composerMeasured}
                            ListHeaderComponent={
                                screenError ? (
                                    <View style={styles.screenErrorWrap}>
                                        <Text numberOfLines={2} style={styles.error}>
                                            {screenError}
                                        </Text>
                                    </View>
                                ) : null
                            }
                            keyboardOffset={keyboardOffset}
                            contentInsetEndAdjustment={contentInsetEndAdjustment}
                            mcpServerIdByName={EMPTY_MCP_SERVER_ID_BY_NAME}
                            artifactWorkspaceId={artifactWorkspaceId}
                            artifactActionStateByKey={artifactActionStateByKey}
                            onOpenArtifact={handleOpenArtifact}
                            onShareArtifact={handleShareArtifact}
                            onCancelArtifactDownload={handleCancelArtifactDownload}
                            onExpandedKeysChange={setExpandedKeys}
                            onViewportPrefetchPlanChange={handleViewportPrefetchPlanChange}
                            onOpenTaskThread={handleOpenTaskThread}
                            onRefresh={refreshThreadTimeline}
                        />
                    ) : (
                        <ThreadState
                            loading={false}
                            label={screenError ?? t('disconnected')}
                            color={theme.colors.typography}
                        />
                    )}
                </View>
                {visibleSnapshot && !showThreadLoader ? (
                    <KeyboardStickyView offset={keyboardStickyOffset} style={styles.composerSticky}>
                        <View ref={composerRef} onLayout={handleComposerAreaLayout}>
                            <ThreadComposer
                                value={composerText}
                                placeholder={t('inputPlaceholder')}
                                sendLabel={t('sendMessage')}
                                stopLabel={t('stopTurn')}
                                steerLabel={t('steerTurn')}
                                disabled={composerDisabled}
                                sending={sending}
                                canSend={canSend}
                                canSteerTurn={canSteerCliRuntimeTurn}
                                steering={steering}
                                hasInFlightTurn={hasInFlightTurn}
                                canStopTurn={canStopTurn}
                                turnCancelling={turnCancelling}
                                error={composerError}
                                attachments={composerAttachments}
                                capabilities={renderedComposerSubmissionPlan.capabilities}
                                skillChips={composerSkillChips}
                                attachmentsEnabled
                                attachmentMenuAccessibilityLabel={t('composerAttachmentMenuTitle')}
                                modelSelectionLabel={modelSelectionLabel}
                                modelSelectionEffortLabel={modelSelectionEffortLabel}
                                modelSelectionLoading={modelSelectionLoading}
                                modelSelectionAccessibilityLabel={t('modelSelectorOpen')}
                                modelSelectionDisabled={modelSelectionDisabled}
                                modelSelectionComplete={modelSelectionComplete}
                                permissionModeOptions={permissionModeOptions}
                                selectedPermissionMode={composerSelectedPermissionMode}
                                inputNativeID={THREAD_COMPOSER_INPUT_NATIVE_ID}
                                voiceVisible={voiceVisible}
                                voiceEnabled={voiceEnabled}
                                voiceBusy={voiceCaptureBusy || voiceCommitProcessing}
                                voiceProcessing={voiceCommitProcessing}
                                voiceLevel={voiceLevel}
                                voiceMicrophoneLabel={t('voiceMicrophone')}
                                voiceKeyboardLabel={t('voiceKeyboard')}
                                voiceHoldLabel={t('voiceHoldToTalk')}
                                voiceReleaseToSendLabel={t('voiceReleaseToSend')}
                                voiceReleaseToCancelLabel={t('voiceReleaseToCancel')}
                                onChangeText={setComposerText}
                                onOpenAttachmentMenu={openAttachmentMenu}
                                onOpenModelSelector={openModelSelector}
                                onOpenPermissionModeSelector={openPermissionModeSelector}
                                onRemoveAttachment={removeAttachment}
                                onRemoveCapability={removeCapability}
                                onRemoveSkillChip={removeSkillChip}
                                onSend={handleSend}
                                onSteerTurn={handleSteerTurn}
                                onStopTurn={handleStopTurn}
                                onVoiceStart={handleVoiceStart}
                                onVoiceCommit={handleVoiceCommit}
                                onVoiceCancel={handleVoiceCancel}
                            />
                        </View>
                    </KeyboardStickyView>
                ) : null}
            </KeyboardGestureArea>
        </View>
    );
};

type SemanticTurnWorkQueryTarget = {
    work: TurnWorkBlock;
    expanded: boolean;
    liveVisible: boolean;
};

const TurnWorkItemsQueryBridge = ({
    threadId,
    enabled,
    expanded,
    liveVisible,
    boundaryHint,
    onRangeChange,
    onNativeSnapshotRefresh,
    work,
}: {
    threadId: string | null;
    enabled: boolean;
    expanded: boolean;
    liveVisible: boolean;
    boundaryHint: TimelineTurnWorkBoundaryHint | null;
    onRangeChange: (turnId: string, range: SemanticTurnWorkRange | null) => void;
    onNativeSnapshotRefresh: () => void;
    work: TurnWorkBlock;
}) => {
    const workItemsQuery = useTurnWorkItemsQuery({
        threadId,
        turnId: work.turnId,
        enabled,
        expanded,
        liveVisible,
        work,
    });
    const workItemsQueryRef = useRef(workItemsQuery);
    const lastBoundaryHintKeyRef = useRef<string | null>(null);
    const workRange = useMemo<SemanticTurnWorkRange>(
        () => ({
            work: workItemsQuery.work,
            items: workItemsQuery.items,
            hasLoadedPage: workItemsQuery.hasLoadedPage,
        }),
        [workItemsQuery.hasLoadedPage, workItemsQuery.items, workItemsQuery.work],
    );

    useEffect(() => {
        workItemsQueryRef.current = workItemsQuery;
    }, [workItemsQuery]);

    useEffect(() => {
        onRangeChange(work.turnId, workRange);
    }, [onRangeChange, work.turnId, workRange]);

    useEffect(() => {
        if (!workItemsQuery.hasLoadedPage) {
            return;
        }

        onNativeSnapshotRefresh();
    }, [onNativeSnapshotRefresh, workItemsQuery.hasLoadedPage, workItemsQuery.pages]);

    useEffect(() => {
        if (!boundaryHint?.visible || boundaryHint.key === lastBoundaryHintKeyRef.current) {
            return;
        }

        lastBoundaryHintKeyRef.current = boundaryHint.key;
        const query = workItemsQueryRef.current;
        if (boundaryHint.nearStart && query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
        }
        if (boundaryHint.nearEnd && query.hasPreviousPage && !query.isFetchingPreviousPage) {
            void query.fetchPreviousPage();
        }
    }, [boundaryHint]);

    return null;
};

const activeSemanticTurnWorkQueryTargets = (
    blocks: readonly TimelineBlock[],
    expandedKeys: readonly string[],
    liveTurnId: string | null,
    snapshot: ClientActiveThreadSnapshot | null,
): SemanticTurnWorkQueryTarget[] => {
    const expandedTurnIds = new Set(
        expandedKeys
            .map(semanticTurnWorkTurnIdFromKey)
            .filter((turnId): turnId is string => turnId !== null),
    );
    const targetsByTurnId = new Map<string, SemanticTurnWorkQueryTarget>();

    for (const block of blocks) {
        if (block.kind.kind !== 'turn_work') {
            continue;
        }

        const work = block.kind.work;
        const expanded = expandedTurnIds.has(work.turnId);
        const protocolVisible = work.presentation === 'expanded_live';
        const liveVisible = protocolVisible || work.turnId === liveTurnId;

        if (!expanded && !liveVisible) {
            continue;
        }

        targetsByTurnId.set(work.turnId, {
            work,
            expanded,
            liveVisible,
        });
    }

    if (snapshot) {
        for (const row of snapshot.rows) {
            if (!('TurnWorkToggle' in row.kind)) {
                continue;
            }

            const group = row.kind.TurnWorkToggle;
            const turnId = semanticTurnWorkTurnIdFromKey(group.toggle_key || row.key);
            if (!turnId || targetsByTurnId.has(turnId)) {
                continue;
            }

            const expanded = expandedTurnIds.has(turnId) || group.is_open;
            const liveVisible = turnId === liveTurnId;
            if (!expanded && !liveVisible) {
                continue;
            }

            targetsByTurnId.set(turnId, {
                work: fallbackTurnWorkBlockFromNativeGroup(turnId, group.elapsed_ms ?? null),
                expanded,
                liveVisible,
            });
        }
    }

    return Array.from(targetsByTurnId.values());
};

const fallbackTurnWorkBlockFromNativeGroup = (
    turnId: string,
    elapsedMs: number | null,
): TurnWorkBlock => ({
    turnId,
    presentation: 'collapsed_after_final',
    state: 'completed',
    elapsedMs,
    workCount: 1,
    visibleWorkCount: 0,
    hiddenWorkCount: 1,
    hasMoreBefore: false,
    hasMoreAfter: false,
    beforeCursor: null,
    afterCursor: null,
    firstWorkItemId: null,
    lastWorkItemId: null,
    startedAtUnixMs: null,
    completedAtUnixMs: null,
});

const semanticTurnWorkTurnIdFromKey = (key: string): string | null => {
    if (!key.startsWith(SEMANTIC_TURN_WORK_GROUP_PREFIX)) {
        return null;
    }

    return key.slice(SEMANTIC_TURN_WORK_GROUP_PREFIX.length) || null;
};

const ThreadState = ({
    color,
    label,
    loading = false,
}: {
    color?: string;
    label: string;
    loading?: boolean;
}) => {
    const { theme, rt } = useUnistyles();

    return (
        <View
            style={[
                styles.stateContainer,
                {
                    paddingTop: theme.screenContentPadding('child').paddingTop,
                    paddingBottom: rt.insets.bottom + theme.space(20),
                },
            ]}
        >
            {loading ? (
                <Spinner size={theme.space(5)} color={color ?? theme.colors.typography} />
            ) : (
                <Text style={styles.stateText}>{label}</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.muted,
    },
    keyboardWrap: {
        flex: 1,
    },
    threadWrap: {
        flex: 1,
    },
    composerSticky: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 1,
    },
    screenErrorWrap: {
        paddingHorizontal: theme.space(4),
        paddingBottom: theme.space(2),
        gap: theme.space(1),
    },
    error: {
        color: theme.colors.dangerText,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    stateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space(2),
        paddingHorizontal: theme.space(6),
        backgroundColor: theme.colors.background,
    },
    stateText: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        textAlign: 'center',
        opacity: 0.7,
    },
}));

const errorMessage = (error: unknown) =>
    error instanceof Error ? error.message : 'CLI runtime operation failed.';

export default ThreadScreen;

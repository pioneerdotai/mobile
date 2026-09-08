import { dispatchComposerCatalog, useComposerCatalog } from '@/client/composer-catalog';
import { beginMessageDeletion } from '@/client/message-deletion';
import { artifactActionPresentation } from '@/services/artifacts/mobile-action-state';
import { useThreadArtifacts } from '@/client/thread-artifacts';
import {
    beginComposerOperation,
    composerSnapshot,
    dispatchComposer,
    completeComposerOperation,
    composerOperationPlan,
    useComposerPublication,
    type ComposerOperationIdentity,
} from '@/client/composer';
import { dispatchNavigation, navigationSnapshot } from '@/client/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, Text, View } from 'react-native';
import { KeyboardGestureArea, KeyboardStickyView } from 'react-native-keyboard-controller';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useKeyboardChatComposerInset } from '@legendapp/list/keyboard';
import type { LegendListRef } from '@legendapp/list/react-native';
import { customAlphabet } from 'nanoid';

import {
    pioneerClient,
    type ComposerSkillChip,
    type ComposerMentionCandidate,
    type ComposerSkillPickerProjection,
    type Thread,
    type VoiceTurnContext,
} from '@/client';
import Spinner from '@/components/feedback/spinner';
import {
    ThreadComposer,
    THREAD_COMPOSER_MIN_INPUT_HEIGHT,
} from '@/components/thread/composer/thread-composer';
import { ThreadTimeline } from '@/components/thread/timeline/thread-timeline';
import {
    DEFAULT_TIMELINE_PRESENTATION_CONTEXT,
    TASK_CHILD_TIMELINE_PRESENTATION_CONTEXT,
} from '@/components/thread/timeline/timeline-grouping';
import { useActiveThread } from '@/hooks/use-active-thread';
import { useGateway } from '@/hooks/use-gateway';
import { useTimelineReconnectInvalidation } from '@/hooks/use-timeline-reconnect-invalidation';
import { useThreadTimelineBlocksQuery } from '@/hooks/use-thread-timeline-blocks-query';
import { useTimelineQueryCancellation } from '@/hooks/use-timeline-query-cancellation';
import { composerSubmissionPlanForProvider } from '@/services/providers/cli-runtime';
import { useThreadPresentation } from '@/hooks/use-thread-presentation';
import { projectAgentActionCapabilities } from '@/services/threads/agent-capabilities';
import type { TimelineRow } from '@/services/threads/conversation/timeline';
import {
    MobileVoiceCaptureError,
    type MobileVoiceCaptureSession,
    startMobileVoiceCapture,
} from '@/services/voice/mobile-capture';
import { resolveVoiceComposerAvailability } from '@/services/voice-input/composer';
import { useVoiceInputDataSourceState } from '@/services/voice-input/data-source';
import {
    cancelMobileArtifactDownload,
    downloadAndShareMobileArtifact,
    openMobileArtifact,
} from '@/services/artifacts/mobile-actions';
import { registerThreadFileIntent, releaseThreadFileIntent } from '@/services/thread-files/intent';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useGatewayStore } from '@/stores/gateway';
import { useThreadTreeStore } from '@/stores/thread-tree';
import { useWorkspaceStore } from '@/stores/workspace';
import { useThreadCapabilities, retryThreadCapabilities } from '@/client/thread-capabilities';
import {
    MessageMutationModal,
    type MessageMutationTarget,
} from '@/components/thread/timeline/message-mutation-modal';
import { useThreadMembers } from '@/client/thread-members';
import { ThreadActionsSheet } from '@/components/overlays/thread-actions';

type ThreadScreenProps = {
    threadId: string;
    initialThread?: Thread | null;
    taskChildThread?: boolean;
    threadActionsOpen?: boolean;
    onThreadActionsClose?: () => void;
    onOpenMembers?: () => void;
};

const THREAD_COMPOSER_INPUT_NATIVE_ID = 'thread-composer-input';
const STICKY_KEYBOARD_OFFSET_CLOSED = 0;
const EMPTY_MCP_SERVER_ID_BY_NAME: Readonly<Record<string, string>> = {};
const EMPTY_SKILL_PICKER: ComposerSkillPickerProjection = { packs: [], standalone: [] };
const VOICE_TURN_ID_LEN = 21;
const VOICE_TURN_ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
const generateArtifactOperationId = customAlphabet(VOICE_TURN_ID_ALPHABET, VOICE_TURN_ID_LEN);

const ThreadScreen = ({
    threadId,
    initialThread = null,
    taskChildThread = false,
    threadActionsOpen = false,
    onThreadActionsClose,
    onOpenMembers,
}: ThreadScreenProps) => {
    const { t } = useTranslation('threads');
    const { theme, rt } = useUnistyles();

    const [focused, setFocused] = useState(false);
    const [messageMutationTarget, setMessageMutationTarget] =
        useState<MessageMutationTarget | null>(null);

    const treeSnapshot = useThreadTreeStore((state) => state.snapshot);
    const currentPrincipalId = useGatewayStore((state) => state.sessionPrincipalId);

    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

    const thread = treeSnapshot?.threads_by_id[threadId] ?? null;
    const activeThread = thread ?? initialThread ?? null;
    const { connectionId, connectionState } = useGateway();
    const voiceInputDataSource = useVoiceInputDataSourceState();
    const voiceInputTarget = voiceInputDataSource.target;

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
        composerReplyTarget,
        composerSelectedMentions,
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
        setExpandedKeys,
    } = useActiveThread(activeThread, activeWorkspaceId, focused, threadId);

    const dismissedSteerErrorGeneration = useActiveThreadStore(
        (state) => state.dismissedSteerErrorGeneration,
    );
    const dismissedVoiceErrorGeneration = useActiveThreadStore(
        (state) => state.dismissedVoiceErrorGeneration,
    );
    const syncComposerModelSelection = useActiveThreadStore(
        (state) => state.syncComposerModelSelection,
    );
    const setComposerPermissionModeSwitcherOpen = useActiveThreadStore(
        (state) => state.setComposerPermissionModeSwitcherOpen,
    );
    const setComposerError = useActiveThreadStore((state) => state.setComposerError);
    const removeComposerAttachment = useActiveThreadStore(
        (state) => state.removeComposerAttachment,
    );
    const removeComposerCapability = useActiveThreadStore(
        (state) => state.removeComposerCapability,
    );
    const setComposerModeSwitcherOpen = useActiveThreadStore(
        (state) => state.setComposerModeSwitcherOpen,
    );
    const setComposerMode = useActiveThreadStore((state) => state.setComposerMode);
    const composerModeNotice = useActiveThreadStore((state) => state.composerModeNotice);
    const dismissComposerModeNotice = useActiveThreadStore(
        (state) => state.dismissComposerModeNotice,
    );
    const setComposerReplyTarget = useActiveThreadStore((state) => state.setComposerReplyTarget);
    const clearComposerReplyTarget = useActiveThreadStore(
        (state) => state.clearComposerReplyTarget,
    );
    const selectComposerMention = useActiveThreadStore((state) => state.selectComposerMention);
    const removeComposerMention = useActiveThreadStore((state) => state.removeComposerMention);
    const messageMode = composerSelectedMode === 'Message';
    const composerModeLabel =
        composerSelectedMode === 'Agent'
            ? t('modeAgentLabel')
            : composerSelectedMode === 'Chat'
              ? t('modeChatLabel')
              : t('modeMessageLabel');
    const renderedComposerSubmissionPlan = useMemo(
        () =>
            composerSubmissionPlanForProvider(
                messageMode ? null : composerSelectedProvider,
                composerText,
                composerAttachments.length > 0,
                messageMode ? [] : composerCapabilities,
            ),
        [
            composerAttachments.length,
            composerCapabilities,
            composerSelectedProvider,
            composerText,
            messageMode,
        ],
    );
    const timelineRef = useRef<LegendListRef>(null);
    const composerRef = useRef<View>(null);
    const [composerHeight, setComposerHeight] = useState(THREAD_COMPOSER_MIN_INPUT_HEIGHT);
    const [voiceLevel, setVoiceLevel] = useState(0);
    const [voiceCaptureBusy, setVoiceCaptureBusy] = useState(false);
    const voiceMountedRef = useRef(true);
    const voiceOperationRef = useRef<ComposerOperationIdentity | null>(null);
    const voiceSessionRef = useRef<MobileVoiceCaptureSession | null>(null);
    const voiceStartPromiseRef = useRef<Promise<MobileVoiceCaptureSession> | null>(null);
    const voiceReleaseIntentRef = useRef<'commit' | 'cancel' | null>(null);

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
    const visibleSnapshot = snapshot?.thread_id === threadId ? snapshot : null;
    const visibleThreadId = visibleSnapshot?.thread_id ?? threadId;
    const composerPublication = useComposerPublication(visibleThreadId);
    const presentedPolicyNotice = useRef<string | null>(null);
    const steerOperation =
        composerPublication?.operation?.kind === 'steer' ? composerPublication.operation : null;
    const steering =
        !!steerOperation && ['pending', 'preparing'].includes(steerOperation.status.kind);
    const steerError =
        steerOperation?.status.kind === 'failed' &&
        steerOperation.identity.generation !== dismissedSteerErrorGeneration
            ? steerOperation.status.message
            : null;
    const messageEditTarget = composerPublication?.message_edit ?? null;
    const messageEditPending =
        composerPublication?.operation?.kind === 'edit_message' &&
        ['pending', 'preparing'].includes(composerPublication.operation.status.kind);
    const messageEditError = messageEditTarget?.failed
        ? t(
              messageEditTarget.conflicted
                  ? 'timelineMessageMutationConflict'
                  : 'timelineMessageEditFailed',
          )
        : null;
    const threadMembers = useThreadMembers(
        visibleThreadId,
        focused,
        visibleSnapshot?.workspace_id ?? null,
    );
    const mentionCandidates = threadMembers?.mention_candidates ?? [];

    const threadAuthorization = useThreadCapabilities(
        visibleThreadId,
        focused,
        visibleSnapshot?.workspace_id ?? null,
    );
    const composerCatalog = useComposerCatalog(
        visibleThreadId,
        composerPublication?.draft_id ?? null,
        { kind: 'skills' },
        focused &&
            connected &&
            !messageMode &&
            threadAuthorization?.snapshot?.workspace?.capabilities.can_use_skills === true,
    );
    const activeComposerSkillPicker = useMemo(
        () =>
            composerCatalog
                ? pioneerClient.composerSkillPackPicker({
                      thread_id: composerCatalog.thread_id,
                      draft_id: composerCatalog.draft_id,
                      query: '',
                  })
                : EMPTY_SKILL_PICKER,
        [composerCatalog],
    );
    const composerSkillChips = useMemo(
        () =>
            pioneerClient.composerSkillChips({
                selections: messageMode ? [] : composerSkillSelections,
                picker: activeComposerSkillPicker,
            }),
        [activeComposerSkillPicker, composerSkillSelections, messageMode],
    );
    const isLiveDraftThread = Boolean(
        visibleSnapshot?.draft_thread_id && visibleSnapshot.draft_thread_id === visibleThreadId,
    );
    const workspaceAgentCapabilities = threadAuthorization?.snapshot?.workspace?.capabilities;
    const threadAgentCapabilities = threadAuthorization?.snapshot?.thread?.capabilities;
    const agentActionCapabilities = projectAgentActionCapabilities({
        isDraftThread: isLiveDraftThread,
        workspace: workspaceAgentCapabilities,
        thread: threadAgentCapabilities,
    });
    const permissionModeOptions = composerPublication?.permission_options ?? [];
    const canReadArtifacts = isLiveDraftThread
        ? (workspaceAgentCapabilities?.can_read_artifacts ?? false)
        : (threadAgentCapabilities?.can_read_artifacts ?? false);
    const canAttachArtifacts = isLiveDraftThread
        ? (threadAuthorization?.snapshot?.workspace?.execution_draft_policy.can_attach_artifacts ??
          false)
        : Boolean(
              threadAgentCapabilities?.can_write_artifacts &&
              threadAgentCapabilities.can_bind_artifacts,
          );
    const artifactPresentationPolicy = useMemo(
        () =>
            pioneerClient.artifactPresentationPolicy({
                can_read_artifacts: canReadArtifacts,
                can_attach_artifacts: canAttachArtifacts,
                connected,
            }),
        [canAttachArtifacts, canReadArtifacts, connected],
    );

    const handleOpenMessageRevisions = useCallback(
        (turnId: string) => {
            router.push({
                pathname: '/message-revisions',
                params: { threadId: visibleThreadId, turnId },
            });
        },
        [visibleThreadId],
    );

    const handleOpenThreadFile = useCallback(
        (turnId: string, itemId: string, href: string) => {
            if (!visibleThreadId) return;

            const intent = registerThreadFileIntent({
                threadId: visibleThreadId,
                turnId,
                itemId,
                href,
            });
            try {
                router.push({
                    pathname: '/source-file',
                    params: { intent },
                });
            } catch {
                releaseThreadFileIntent(intent);
            }
        },
        [visibleThreadId],
    );

    const artifactInput = useThreadArtifacts(
        visibleThreadId,
        focused,
        visibleSnapshot?.workspace_id ?? activeWorkspaceId,
    );
    const artifactActionStateByKey = useMemo(
        () => artifactActionPresentation(artifactInput),
        [artifactInput],
    );
    const artifactWorkspaceId = visibleSnapshot?.workspace_id ?? activeWorkspaceId;
    const handleOpenArtifact = useCallback(
        (artifactId: string, versionId: string | null = null) => {
            if (!artifactWorkspaceId || !artifactPresentationPolicy.can_open) return;
            void openMobileArtifact({
                workspaceId: artifactWorkspaceId,
                artifactId,
                versionId,
                threadId: visibleThreadId,
            });
        },
        [artifactPresentationPolicy.can_open, artifactWorkspaceId, visibleThreadId],
    );
    const handleShareArtifact = useCallback(
        (artifactId: string, versionId: string | null = null) => {
            if (!artifactWorkspaceId || !artifactPresentationPolicy.can_share) return;
            void downloadAndShareMobileArtifact(
                {
                    workspaceId: artifactWorkspaceId,
                    artifactId,
                    versionId,
                    threadId: visibleThreadId,
                },
                `artifact-${generateArtifactOperationId()}`,
            );
        },
        [artifactPresentationPolicy.can_share, artifactWorkspaceId, visibleThreadId],
    );
    const handleCancelArtifactDownload = useCallback(
        (artifactId: string, versionId: string | null, operationId: string) => {
            const action = artifactInput?.actions.find(
                (a) =>
                    a.identity.artifact_id === artifactId &&
                    (a.identity.version_id ?? null) === versionId &&
                    (a.download?.operation_id ?? '') === operationId,
            );
            if (action) cancelMobileArtifactDownload(action.identity);
        },
        [artifactInput],
    );
    const [composerMeasurement, setComposerMeasurement] = useState<{
        threadId: string;
        measured: boolean;
    } | null>(null);
    const composerMeasured =
        composerMeasurement?.threadId === visibleThreadId && composerMeasurement.measured;
    const timelineIdentityKey = visibleThreadId;
    const visibleTurnId = visibleSnapshot?.projection.in_flight_turn_id ?? null;
    useTimelineQueryCancellation(visibleThreadId, focused);
    useTimelineReconnectInvalidation(visibleThreadId, focused);

    const threadTimelineBlocksQuery = useThreadTimelineBlocksQuery({
        threadId: visibleThreadId,
        enabled:
            focused && connected && !isLiveDraftThread && Boolean(visibleSnapshot?.domain_revision),
    });
    const { refetch: refetchThreadTimelineBlocks } = threadTimelineBlocksQuery;
    const threadTimelineBlocksQueryRef = useRef(threadTimelineBlocksQuery);
    useEffect(() => {
        threadTimelineBlocksQueryRef.current = threadTimelineBlocksQuery;
    }, [threadTimelineBlocksQuery]);
    const { rows: renderedTimelineRowsForVoice } = useThreadPresentation(visibleThreadId, focused);
    const hasNativeTimelineRows = renderedTimelineRowsForVoice.length > 0;
    const voiceOperation =
        composerPublication?.operation?.kind === 'voice' ? composerPublication.operation : null;
    const voiceCommitPendingTurnId = voiceOperation?.voice_committing
        ? voiceOperation.voice_turn_id
        : null;
    const voiceResult =
        voiceOperation?.identity.generation === dismissedVoiceErrorGeneration
            ? null
            : voiceOperation?.voice_result;
    const voiceResultError =
        voiceResult?.action === 'show_no_speech_error'
            ? voiceResult.error?.message || t('voiceNoSpeech')
            : voiceResult?.action === 'show_finalize_error'
              ? voiceResult.error?.message || t('voiceTranscriptionFailed')
              : null;
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
    const avatarRailTopInset = theme.screenHeaderHeight();

    const shouldUseDraftComposerSelection = isLiveDraftThread && !composerModelManuallySelected;
    const selectedProviderReady = composerPublication?.selected_provider_ready ?? false;
    const selectedProvider = selectedProviderReady ? composerSelectedProvider : null;
    const selectedModel = selectedProviderReady ? composerSelectedModel : null;
    const selectedReasoningEffort = selectedProviderReady ? composerSelectedReasoningEffort : null;
    const modelSelectionComplete = messageMode || Boolean(selectedProvider && selectedModel);
    const modelDisplay = composerPublication?.model_display;
    const matchingModelDisplay =
        modelDisplay?.key.provider === selectedProvider && modelDisplay?.key.model === selectedModel
            ? modelDisplay
            : null;
    const selectedModelDisplayName = matchingModelDisplay?.label ?? null;
    const modelDisplayNameLoading = matchingModelDisplay?.request.kind === 'loading';
    const selectedReasoningEffortLabel =
        matchingModelDisplay?.reasoning_effort === selectedReasoningEffort
            ? matchingModelDisplay.reasoning_effort_label
            : null;
    const reasoningEffortLabelLoading = modelDisplayNameLoading;
    const modelSelectionLoading =
        modelDisplayNameLoading ||
        (shouldUseDraftComposerSelection &&
            defaultComposerSelectionLoading &&
            (!selectedProvider || !selectedModel));
    const modelSelectionLabel = selectedModelDisplayName ?? t('modelSelectorSelectModel');
    const modelSelectionEffortLabel =
        modelSelectionLoading || reasoningEffortLabelLoading ? null : selectedReasoningEffortLabel;
    useEffect(() => {
        const reconciliation = composerPublication?.reconciliation;
        const notice = `${composerPublication?.thread_id}:${composerPublication?.draft_id}:${reconciliation?.draft.policy_fingerprint}`;
        if (
            presentedPolicyNotice.current !== notice &&
            reconciliation?.reasons?.some((reason) => reason.kind !== 'policy_generation')
        ) {
            presentedPolicyNotice.current = notice;
            setComposerError(t('composerAuthorizationSelectionsUpdated'));
        }
    }, [composerPublication, setComposerError, t]);
    const selectedPermissionModeAllowed =
        composerPublication?.selected_permission_mode_allowed ?? false;
    const canWriteInActiveThread = Boolean(
        isLiveDraftThread
            ? workspaceAgentCapabilities?.can_create_thread
            : threadAgentCapabilities?.can_write,
    );
    const canUseAgentModels = Boolean(
        agentActionCapabilities.canStart && selectedPermissionModeAllowed,
    );
    const composerDisabled = Boolean(
        !connected ||
        closed ||
        (messageMode && !canWriteInActiveThread) ||
        (!messageMode && visibleSnapshot?.projection.composer_locked) ||
        (!messageMode && !canUseAgentModels) ||
        sending,
    );
    const openComposerModeSelector = useCallback(() => {
        if (composerDisabled) {
            return;
        }

        setComposerModeSwitcherOpen(true);
    }, [composerDisabled, setComposerModeSwitcherOpen]);
    const modelSelectionDisabled = Boolean(sending || !canUseAgentModels);
    const voiceStatusResponse = voiceInputTarget
        ? composerPublication?.voice_readiness?.response
        : null;
    const voiceStatus = voiceStatusResponse?.status ?? null;
    const voiceAvailability = resolveVoiceComposerAvailability({
        online: voiceInputDataSource.kind === 'online',
        voiceStatus,
    });
    const voiceReady = voiceAvailability.kind === 'ready';
    const voiceVisible = voiceReady;
    const voiceEnabled = Boolean(
        !composerDisabled &&
        !voiceCommitProcessing &&
        !hasInFlightTurn &&
        (messageMode || modelSelectionComplete) &&
        activeWorkspaceId &&
        visibleThreadId &&
        voiceReady,
    );

    const activeRuntimeSelection = composerPublication?.runtime_selection;
    const activeCliRuntimeSupportsSteer =
        connected &&
        activeRuntimeSelection?.workspace_id === activeWorkspaceId &&
        activeRuntimeSelection.identity.thread_id === visibleThreadId
            ? (activeRuntimeSelection.active_runtime_supports_steer ?? null)
            : null;
    const activeCliRuntimeCanSteer = activeCliRuntimeSupportsSteer ?? false;
    const canSteerCliRuntimeTurn = Boolean(
        connected &&
        agentActionCapabilities.canSteer &&
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
        voiceMountedRef.current = true;
        return () => {
            voiceMountedRef.current = false;
            if (voiceOperationRef.current)
                completeComposerOperation(voiceOperationRef.current, { kind: 'cancelled' });
            voiceOperationRef.current = null;
            voiceReleaseIntentRef.current = 'cancel';
            voiceStartPromiseRef.current = null;
            const session = voiceSessionRef.current;
            voiceSessionRef.current = null;
            if (session) void session.cancel('mobile_screen_unmounted').catch(() => null);
        };
    }, [visibleThreadId]);

    useEffect(() => {
        const operation = composerPublication?.operation;
        if (
            operation?.kind !== 'voice' ||
            operation.status.kind !== 'cancelled' ||
            operation.identity.generation !== voiceOperationRef.current?.generation
        )
            return;
        voiceOperationRef.current = null;
        voiceStartPromiseRef.current = null;
        voiceReleaseIntentRef.current = 'cancel';
        const session = voiceSessionRef.current;
        voiceSessionRef.current = null;
        if (session) void session.cancel('composer_operation_cancelled').catch(() => null);
        setVoiceCaptureBusy(false);
        setVoiceLevel(0);
    }, [composerPublication]);

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
        if (visibleThreadId) retryThreadCapabilities(visibleThreadId);
        await open();
        if (!isLiveDraftThread) {
            await refetchThreadTimelineBlocks();
        }
    }, [isLiveDraftThread, open, refetchThreadTimelineBlocks, visibleThreadId]);

    const voiceReadinessDraftId = composerPublication?.draft_id;
    useEffect(() => {
        if (!visibleThreadId || voiceReadinessDraftId === undefined) return;
        dispatchComposer({
            kind: 'set_voice_readiness_demand',
            thread_id: visibleThreadId,
            draft_id: voiceReadinessDraftId,
            demand: focused && connected && activeWorkspaceId ? 'while_visible' : 'suspended',
        });
        return () => {
            dispatchComposer({
                kind: 'set_voice_readiness_demand',
                thread_id: visibleThreadId,
                draft_id: voiceReadinessDraftId,
                demand: 'suspended',
            });
        };
    }, [
        visibleThreadId,
        voiceReadinessDraftId,
        focused,
        connected,
        connectionId,
        activeWorkspaceId,
    ]);

    const handleOpenTaskThread = useCallback(
        (row: Extract<TimelineRow, { type: 'task-anchor' }>) => {
            if (!row.childThreadId || !visibleThreadId) {
                return;
            }

            const workspaceId = navigationSnapshot()?.workspace_id;
            if (!workspaceId) return;
            const transition = dispatchNavigation({
                kind: 'push_task_thread',
                entry: {
                    parent_thread_id: visibleThreadId,
                    child_thread_id: row.childThreadId,
                    workspace_id: workspaceId,
                    title: row.title,
                },
            });
            if (transition.outcome !== 'changed') return;
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

    const cancelMessageEdit = useCallback(() => {
        const input = composerSnapshot(visibleThreadId);
        if (
            !input ||
            (input.operation?.kind === 'edit_message' &&
                ['pending', 'preparing'].includes(input.operation.status.kind))
        )
            return;
        dispatchComposer({ kind: 'clear', thread_id: input.thread_id, draft_id: input.draft_id });
    }, [visibleThreadId]);

    const submitMessageEdit = useCallback(() => {
        const input = composerSnapshot(visibleThreadId);
        if (!input?.message_edit) return;
        dispatchComposer({
            kind: 'submit_message_edit',
            thread_id: input.thread_id,
            draft_id: input.draft_id,
        });
    }, [visibleThreadId]);

    const handleSend = useCallback(() => {
        if (messageEditTarget) {
            void submitMessageEdit();
            return;
        }

        if (
            !renderedComposerSubmissionPlan.has_composer_payload &&
            !messageMode &&
            composerSkillSelections.length === 0
        ) {
            return;
        }

        void sendText();
    }, [
        composerSkillSelections.length,
        messageEditTarget,
        messageMode,
        renderedComposerSubmissionPlan.has_composer_payload,
        sendText,
        submitMessageEdit,
    ]);

    const handleReplyToMessage = useCallback(
        (row: Extract<TimelineRow, { type: 'user-message' }>) => {
            if (row.deleted || !row.turnId.trim()) {
                return;
            }
            if (messageEditPending) {
                return;
            }
            if (messageEditTarget) {
                useActiveThreadStore.getState().clearComposerPayload();
            }
            const preview = Array.from(row.text.trim()).slice(0, 160).join('');
            if (composerSelectedMode !== 'Message') {
                setComposerMode('Message');
            }
            setComposerReplyTarget({
                turn_id: row.turnId,
                author_display_name: row.author?.display_name ?? null,
                preview: preview || null,
            });
        },
        [
            composerSelectedMode,
            messageEditTarget,
            messageEditPending,
            setComposerMode,
            setComposerReplyTarget,
        ],
    );

    const handleEditMessage = useCallback(
        (row: Extract<TimelineRow, { type: 'user-message' }>) => {
            const input = composerSnapshot(visibleThreadId);
            if (!input) return;
            dispatchComposer({
                kind: 'start_message_edit',
                thread_id: input.thread_id,
                draft_id: input.draft_id,
                turn_id: row.turnId,
            });
        },
        [visibleThreadId],
    );

    const handleDeleteMessage = useCallback(
        (row: Extract<TimelineRow, { type: 'user-message' }>) => {
            if (!visibleThreadId || row.deleted || row.mode !== 'Message') return;
            const plan = beginMessageDeletion(visibleThreadId, row.turnId, row.revision);
            if (plan) setMessageMutationTarget({ kind: 'delete', plan });
        },
        [visibleThreadId],
    );

    const handleSelectMention = useCallback(
        (candidate: ComposerMentionCandidate) => {
            selectComposerMention(candidate);
        },
        [selectComposerMention],
    );

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
        async (operation: ComposerOperationIdentity): Promise<VoiceTurnContext> => {
            const snapshot = await pioneerClient.prepareVoiceComposerSnapshot({
                operation,
            });
            if (!composerOperationPlan(operation)) throw new Error('voice_operation_cancelled');
            return snapshot.context;
        },
        [],
    );

    const finishVoiceCapture = useCallback(
        (intent: 'commit' | 'cancel') => {
            const session = voiceSessionRef.current;
            const identity = voiceOperationRef.current;
            if (!session || !identity) {
                if (voiceStartPromiseRef.current) {
                    voiceReleaseIntentRef.current = intent;
                    if (intent === 'cancel' && identity) {
                        completeComposerOperation(identity, { kind: 'cancelled' });
                    }
                }
                return;
            }

            voiceSessionRef.current = null;
            voiceReleaseIntentRef.current = null;
            setVoiceCaptureBusy(true);
            if (intent === 'commit') {
                const accepted = dispatchComposer({ kind: 'commit_voice_capture', identity });
                if (accepted.outcome !== 'changed') {
                    void session.cancel('voice_commit_cancelled').catch(() => null);
                    setVoiceCaptureBusy(false);
                    return;
                }
            }

            if (intent === 'cancel') completeComposerOperation(identity, { kind: 'cancelled' });
            const operation =
                intent === 'commit'
                    ? session.commit(() => prepareVoiceContext(identity))
                    : session.cancel('mobile_release_cancel');

            void operation
                .then(() => undefined)
                .catch((captureError) => {
                    completeComposerOperation(identity, {
                        kind: 'failed',
                        message: voiceComposerErrorMessage(captureError),
                    });
                    if (
                        voiceMountedRef.current &&
                        voiceOperationRef.current?.generation === identity.generation
                    ) {
                        useActiveThreadStore
                            .getState()
                            .setComposerError(voiceComposerErrorMessage(captureError));
                    }
                })
                .finally(() => {
                    if (
                        !voiceMountedRef.current ||
                        voiceOperationRef.current?.generation !== identity.generation
                    ) {
                        return;
                    }

                    setVoiceCaptureBusy(false);
                    setVoiceLevel(0);
                });
        },
        [prepareVoiceContext, voiceComposerErrorMessage],
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
            storeState.composerSelectedMode !== 'Message' &&
            storeState.composerModelManuallySelected &&
            (!storeState.composerSelectedProvider || !storeState.composerSelectedModel)
        ) {
            storeState.setComposerError(t('modelSelectionRequired'));
            return;
        }

        const plan = beginComposerOperation(visibleThreadId, 'voice');
        if (!plan) return;
        if (!plan.voice_start) {
            completeComposerOperation(plan.identity, { kind: 'cancelled' });
            return;
        }
        const identity = plan.identity;
        voiceOperationRef.current = identity;
        storeState.setComposerError(null);
        setVoiceLevel(0);
        setVoiceCaptureBusy(true);
        voiceReleaseIntentRef.current = null;

        const startPromise = startMobileVoiceCapture({
            operation: identity,
            callbacks: {
                onLevel: (level) => {
                    if (
                        voiceMountedRef.current &&
                        voiceOperationRef.current?.generation === identity.generation
                    ) {
                        setVoiceLevel(level);
                    }
                },
                onError: (captureError) => {
                    completeComposerOperation(identity, {
                        kind: 'failed',
                        message: voiceComposerErrorMessage(captureError),
                    });
                    if (
                        voiceMountedRef.current &&
                        voiceOperationRef.current?.generation === identity.generation
                    ) {
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
                if (
                    !voiceMountedRef.current ||
                    voiceOperationRef.current?.generation !== identity.generation ||
                    !composerOperationPlan(identity)
                ) {
                    void session.cancel('mobile_screen_unmounted').catch(() => null);
                    return;
                }

                voiceStartPromiseRef.current = null;
                voiceSessionRef.current = session;
                setVoiceCaptureBusy(false);

                const releaseIntent = voiceReleaseIntentRef.current;
                if (releaseIntent) {
                    finishVoiceCapture(releaseIntent);
                }
            })
            .catch((captureError) => {
                completeComposerOperation(identity, {
                    kind: 'failed',
                    message: voiceComposerErrorMessage(captureError),
                });
                if (
                    !voiceMountedRef.current ||
                    voiceOperationRef.current?.generation !== identity.generation
                ) {
                    return;
                }

                voiceStartPromiseRef.current = null;
                voiceReleaseIntentRef.current = null;
                setVoiceCaptureBusy(false);
                setVoiceLevel(0);
                useActiveThreadStore
                    .getState()
                    .setComposerError(voiceComposerErrorMessage(captureError));
            });
    }, [
        activeWorkspaceId,
        finishVoiceCapture,
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

    const handleStopTurn = useCallback(() => {
        void stopTurn();
    }, [stopTurn]);

    const handleSteerTurn = useCallback(() => {
        if (!composerPublication) return;
        useActiveThreadStore.getState().setComposerError(null);
        dispatchComposer({
            kind: 'submit_steer',
            thread_id: composerPublication.thread_id,
            draft_id: composerPublication.draft_id,
        });
    }, [composerPublication]);

    const openModelSelector = useCallback(() => {
        useActiveThreadStore.getState().syncComposerModelSelection();
        router.push({ pathname: '/model-selector' });
    }, []);

    const openAttachmentMenu = useCallback(() => {
        useActiveThreadStore.getState().setComposerAttachmentMenuOpen(true);
    }, []);

    const openPermissionModeSelector = useCallback(() => {
        setComposerPermissionModeSwitcherOpen(true);
    }, [setComposerPermissionModeSwitcherOpen]);

    const removeAttachment = useCallback(
        (path: string) => {
            removeComposerAttachment(path);
        },
        [removeComposerAttachment],
    );

    const removeCapability = useCallback(
        (id: string) => {
            removeComposerCapability(id);
        },
        [removeComposerCapability],
    );

    const removeSkillChip = useCallback(
        (chip: ComposerSkillChip) => {
            if (!composerPublication) return;
            dispatchComposerCatalog({
                kind: 'remove_skill_chip',
                thread_id: composerPublication.thread_id,
                draft_id: composerPublication.draft_id,
                key: chip.key,
            });
        },
        [composerPublication],
    );

    useFocusEffect(
        useCallback(() => {
            syncComposerModelSelection();
        }, [syncComposerModelSelection]),
    );

    if (!activeThread && !visibleSnapshot && !treeSnapshot) {
        return <ThreadState loading label={t('loadingThread')} />;
    }

    if (!activeThread && !visibleSnapshot && !loading) {
        return <ThreadState label={t('invalidThread')} />;
    }

    return (
        <View style={styles.container}>
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
                            loading={false}
                            closed={closed}
                            connected={connected}
                            emptyLabel={t('threadEmpty')}
                            closedLabel={t('threadClosed')}
                            disconnectedLabel={t('disconnected')}
                            loadingLabel={t('loadingThread')}
                            presentationActive={focused}
                            contentTopInset={contentTopInset}
                            avatarRailTopInset={avatarRailTopInset}
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
                            currentPrincipalId={currentPrincipalId}
                            canReviewTasks={threadAgentCapabilities?.can_review_tasks ?? false}
                            canCancelTasks={threadAgentCapabilities?.can_cancel_tasks ?? false}
                            canRespondToAgentRequests={
                                threadAgentCapabilities?.can_respond_to_agent_requests ?? false
                            }
                            presentationContext={
                                taskChildThread
                                    ? TASK_CHILD_TIMELINE_PRESENTATION_CONTEXT
                                    : DEFAULT_TIMELINE_PRESENTATION_CONTEXT
                            }
                            onOpenArtifact={
                                artifactPresentationPolicy.can_open ? handleOpenArtifact : undefined
                            }
                            onOpenThreadFile={handleOpenThreadFile}
                            onShareArtifact={
                                artifactPresentationPolicy.can_share
                                    ? handleShareArtifact
                                    : undefined
                            }
                            onCancelArtifactDownload={handleCancelArtifactDownload}
                            onExpandedKeysChange={setExpandedKeys}

                            onOpenTaskThread={handleOpenTaskThread}
                            onOpenMessageRevisions={handleOpenMessageRevisions}
                            onReplyToMessage={handleReplyToMessage}
                            onEditMessage={handleEditMessage}
                            onDeleteMessage={handleDeleteMessage}
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
                                sending={sending || messageEditPending}
                                canSend={canSend}
                                canSteerTurn={canSteerCliRuntimeTurn}
                                steering={steering}
                                hasInFlightTurn={hasInFlightTurn}
                                canStopTurn={canStopTurn && agentActionCapabilities.canCancel}
                                turnCancelling={turnCancelling}
                                composerMode={composerSelectedMode}
                                modeLabel={composerModeLabel}
                                modeAccessibilityLabel={composerModeLabel}
                                modeSwitcherDisabled={composerDisabled}
                                messageMode={messageMode}
                                error={
                                    messageEditError ??
                                    voiceResultError ??
                                    steerError ??
                                    composerError
                                }
                                modeNotice={composerModeNotice}
                                replyTarget={composerReplyTarget}
                                editTarget={
                                    messageEditTarget
                                        ? {
                                              turnId: messageEditTarget.presentation.turn_id,
                                              preview: messageEditTarget.preview,
                                          }
                                        : null
                                }
                                selectedMentions={composerSelectedMentions}
                                mentionCandidates={mentionCandidates}
                                attachments={composerAttachments}
                                capabilities={renderedComposerSubmissionPlan.capabilities}
                                skillChips={composerSkillChips}
                                attachmentsEnabled={
                                    canWriteInActiveThread && artifactPresentationPolicy.can_attach
                                }
                                attachmentMenuAccessibilityLabel={t('composerAttachmentMenuTitle')}
                                dismissLabel={t('dismiss')}
                                replyCancelLabel={t('composerReplyCancel')}
                                editLabel={t('timelineMessageEditTitle')}
                                editCancelLabel={t('cancel')}
                                mentionAddLabel={t('composerMentionAdd')}
                                mentionEmptyLabel={t('composerMentionEmpty')}
                                mentionSearchPlaceholder={t('composerMentionSearch')}
                                mentionSearchDismissLabel={t('composerMentionSearchDismiss')}
                                mentionRemoveLabel={t('composerMentionRemove')}
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
                                onOpenModeSelector={openComposerModeSelector}
                                onDismissModeNotice={dismissComposerModeNotice}
                                onClearReplyTarget={clearComposerReplyTarget}
                                onCancelEdit={cancelMessageEdit}
                                onSelectMention={handleSelectMention}
                                onRemoveMention={removeComposerMention}
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
            {messageMutationTarget &&
            messageMutationTarget.plan.identity.thread_id === visibleThreadId ? (
                <MessageMutationModal
                    key={`${messageMutationTarget.plan.identity.thread_id}:${messageMutationTarget.plan.identity.generation}`}
                    target={messageMutationTarget}
                    onClose={() => setMessageMutationTarget(null)}
                />
            ) : null}
            {onThreadActionsClose ? (
                <ThreadActionsSheet
                    publication={threadMembers}
                    open={threadActionsOpen}
                    // The tree is updated directly by scope mutations and thread_updated events.
                    // The active snapshot can briefly retain the pre-mutation thread while this
                    // screen is being focused again after returning from Members.
                    thread={thread ?? visibleSnapshot?.thread ?? initialThread}
                    onClose={onThreadActionsClose}
                    onOpenMembers={onOpenMembers}
                />
            ) : null}
        </View>
    );
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

export default ThreadScreen;

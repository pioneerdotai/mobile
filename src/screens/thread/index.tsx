import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, Text, View } from 'react-native';
import { KeyboardGestureArea, KeyboardStickyView } from 'react-native-keyboard-controller';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useKeyboardChatComposerInset } from '@legendapp/list/keyboard';
import type { LegendListRef } from '@legendapp/list/react-native';

import {
    pioneerClient,
    type CLIRuntimeThreadBinding,
    type ClientActiveThreadSnapshot,
    type Thread,
} from '@/client';
import Spinner from '@/components/feedback/spinner';
import {
    ThreadComposer,
    THREAD_COMPOSER_MIN_INPUT_HEIGHT,
} from '@/components/thread/composer/thread-composer';
import { ThreadTimeline } from '@/components/thread/timeline/thread-timeline';
import { useActiveThread } from '@/hooks/use-active-thread';
import { useGateway } from '@/hooks/use-gateway';
import {
    useProviderModelDisplayName,
    useProviderModelReasoningEffortLabel,
} from '@/hooks/use-provider-model-display-name';
import { isCliRuntimeProvider } from '@/services/providers/cli-runtime';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useCliRuntimeStore } from '@/stores/cli-runtime';
import { useGatewayStore } from '@/stores/gateway';
import { useThreadTreeStore } from '@/stores/thread-tree';
import { useWorkspaceStore } from '@/stores/workspace';

type ThreadScreenProps = {
    threadId: string | null;
};

const THREAD_COMPOSER_INPUT_NATIVE_ID = 'thread-composer-input';
const STICKY_KEYBOARD_OFFSET_CLOSED = 0;
const EMPTY_MCP_SERVER_ID_BY_NAME: Readonly<Record<string, string>> = {};

type ComposerModelSelection = {
    provider: string;
    model: string;
    selectedReasoningEffort: string | null;
};

const createEmptyActiveThreadSnapshot = (
    threadId: string | null,
    workspaceId: string | null,
): ClientActiveThreadSnapshot => ({
    thread_id: threadId,
    workspace_id: workspaceId,
    thread: null,
    history_loaded: true,
    history_loading: false,
    projection: {
        composer_locked: false,
        in_flight_turn_id: null,
        items: [],
        last_error: null,
        pending_request_id: null,
        phase_label: '',
        revision: 0,
        timeline: [],
        turns: [],
    },
    rows: [],
});

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

const ThreadScreen = ({ threadId }: ThreadScreenProps) => {
    const { t } = useTranslation('threads');
    const { theme, rt } = useUnistyles();

    const isDraftThread = threadId === null;
    const [focused, setFocused] = useState(false);

    const treeSnapshot = useThreadTreeStore((state) => state.snapshot);

    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

    const thread =
        !isDraftThread && threadId ? (treeSnapshot?.threads_by_id[threadId] ?? null) : null;

    const { connectionId, connectionState } = useGateway();

    const {
        snapshot,
        loading,
        error,
        sending,
        turnCancelling,
        composerError,
        composerAttachments,
        composerCapabilities,
        connected,
        canSend,
        hasInFlightTurn,
        canStopTurn,
        composerSelectedProvider,
        composerSelectedModel,
        composerSelectedReasoningEffort,
        defaultComposerSelectionLoading,
        composerModelManuallySelected,
        open,
        sendText,
        stopTurn,
        setComposerAttachments,
        setComposerCapabilities,
        setExpandedKeys,
    } = useActiveThread(thread, activeWorkspaceId, focused);

    const syncComposerModelSelection = useActiveThreadStore(
        (state) => state.syncComposerModelSelection,
    );
    const timelineRef = useRef<LegendListRef>(null);
    const composerRef = useRef<View>(null);
    const [draftText, setDraftText] = useState('');
    const [steering, setSteering] = useState(false);
    const [cliRuntimeThreadBinding, setCliRuntimeThreadBinding] =
        useState<CLIRuntimeThreadBinding | null>(null);
    const [activeCliRuntimeSupportsSteer, setActiveCliRuntimeSupportsSteer] = useState<
        boolean | null
    >(null);

    const [composerHeight, setComposerHeight] = useState(THREAD_COMPOSER_MIN_INPUT_HEIGHT);

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

    const draftSnapshot = useMemo(
        () => createEmptyActiveThreadSnapshot(null, activeWorkspaceId),
        [activeWorkspaceId],
    );

    const visibleSnapshot = isDraftThread
        ? snapshot?.thread_id
            ? snapshot
            : draftSnapshot
        : snapshot?.thread_id === threadId
          ? snapshot
          : null;
    const visibleThreadId = visibleSnapshot?.thread_id ?? (!isDraftThread ? threadId : null);
    const visibleTurnId = visibleSnapshot?.projection.in_flight_turn_id ?? null;

    const closed = Boolean(
        visibleSnapshot?.thread?.status === 'Closed' || thread?.status === 'Closed',
    );

    const waitingForSnapshot =
        !isDraftThread && (loading || (connectionState === 'Connected' && !error));

    const screenError = isDraftThread ? null : error;

    const timelineLoading = isDraftThread ? false : loading;

    const contentTopInset = theme.screenContentPadding('child').paddingTop;

    const activeThreadModelSelection = useMemo(() => {
        const activeThread = visibleSnapshot?.thread ?? thread;

        return modelSelectionFromThread(activeThread);
    }, [thread, visibleSnapshot]);

    const activeThreadModelProvider = activeThreadModelSelection?.provider ?? null;
    const activeThreadModel = activeThreadModelSelection?.model ?? null;
    const activeThreadReasoningEffort = activeThreadModelSelection?.selectedReasoningEffort ?? null;
    const shouldUseThreadModelSelection =
        Boolean(activeThreadModelSelection) && !composerModelManuallySelected;
    const shouldUseDraftComposerSelection =
        isDraftThread && !visibleSnapshot?.thread_id && !composerModelManuallySelected;
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
    const selectedReasoningEffort = shouldUseThreadModelSelection
        ? activeThreadReasoningEffort
        : composerModelManuallySelected || shouldUseDraftComposerSelection
          ? composerSelectedReasoningEffort
          : null;
    const cliRuntimeSelected = isCliRuntimeProvider(selectedProvider);
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
    const lastGatewayEvent = useGatewayStore((state) => state.lastEvent);
    const lastGatewayEventSerial = useGatewayStore((state) => state.lastEventSerial);
    const applyCliRuntimeGatewayEvent = useCliRuntimeStore((state) => state.applyGatewayEvent);
    const allCliRuntimePendingRequests = useCliRuntimeStore((state) => state.pendingRequests);

    const cliRuntimePendingRequests = useMemo(
        () =>
            allCliRuntimePendingRequests.filter(
                (request) =>
                    request.workspace_id === activeWorkspaceId &&
                    request.thread_id === visibleThreadId,
            ),
        [activeWorkspaceId, allCliRuntimePendingRequests, visibleThreadId],
    );
    const activeCliRuntimeThreadBinding =
        cliRuntimeThreadBinding?.workspace_id === activeWorkspaceId &&
        cliRuntimeThreadBinding.thread_id === visibleThreadId
            ? cliRuntimeThreadBinding
            : null;
    const activeCliRuntimeCanSteer = activeCliRuntimeSupportsSteer ?? false;
    const canSteerCliRuntimeTurn = Boolean(
        connected &&
        activeCliRuntimeThreadBinding &&
        activeCliRuntimeCanSteer &&
        visibleThreadId &&
        visibleTurnId &&
        draftText.trim().length > 0 &&
        composerAttachments.length === 0 &&
        composerCapabilities.length === 0,
    );

    useFocusEffect(
        useCallback(() => {
            setFocused(true);

            return () => {
                setFocused(false);
            };
        }, []),
    );

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
        },
        [onComposerLayout, updateComposerHeight],
    );

    const handleSend = useCallback(() => {
        const hasComposerPayload =
            draftText.trim().length > 0 ||
            composerAttachments.length > 0 ||
            (!cliRuntimeSelected && composerCapabilities.length > 0);

        if (!hasComposerPayload) {
            return;
        }

        void sendText(draftText).then((sent) => {
            if (sent) {
                setDraftText('');
            }
        });
    }, [
        cliRuntimeSelected,
        composerAttachments.length,
        composerCapabilities.length,
        draftText,
        sendText,
    ]);

    const handleStopTurn = useCallback(() => {
        void stopTurn();
    }, [stopTurn]);

    const handleSteerTurn = useCallback(() => {
        const message = draftText.trim();

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
                setDraftText('');
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
        draftText,
        visibleThreadId,
        visibleTurnId,
    ]);

    const updateDraftExpandedKeys = useCallback((_keys: string[]) => {}, []);

    const refreshDraftThread = useCallback(async () => {}, []);

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

    const removeAttachment = useCallback(
        (index: number) => {
            const next = pioneerClient.composerAttachmentsUpdate({
                attachments: useActiveThreadStore.getState().composerAttachments,
                action: { RemoveAt: { index } },
            });
            setComposerAttachments(next);
        },
        [setComposerAttachments],
    );

    const removeCapability = useCallback(
        (index: number) => {
            const next = pioneerClient.composerCapabilitiesUpdate({
                capabilities: useActiveThreadStore.getState().composerCapabilities,
                action: { RemoveAt: { index } },
            });
            setComposerCapabilities(next);
        },
        [setComposerCapabilities],
    );

    useFocusEffect(
        useCallback(() => {
            if (!activeThreadModelProvider || !activeThreadModel) {
                return;
            }

            syncComposerModelSelection(
                activeThreadModelProvider,
                activeThreadModel,
                activeThreadReasoningEffort,
            );
        }, [
            activeThreadModel,
            activeThreadModelProvider,
            activeThreadReasoningEffort,
            syncComposerModelSelection,
        ]),
    );

    useEffect(() => {
        if (!lastGatewayEvent) {
            return;
        }

        applyCliRuntimeGatewayEvent(lastGatewayEvent);
    }, [applyCliRuntimeGatewayEvent, lastGatewayEvent, lastGatewayEventSerial]);

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
        const runtimeId = activeCliRuntimeThreadBinding?.runtime_id ?? null;

        if (!connected || !activeWorkspaceId || !runtimeId) {
            setActiveCliRuntimeSupportsSteer(null);
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

                const runtime = response.runtimes.find((item) => item.runtime_id === runtimeId);
                setActiveCliRuntimeSupportsSteer(runtime?.capabilities.supports_steer ?? null);
            })
            .catch(() => {
                if (!cancelled) {
                    setActiveCliRuntimeSupportsSteer(null);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [activeCliRuntimeThreadBinding?.runtime_id, activeWorkspaceId, connected, connectionId]);

    if (!isDraftThread && !thread && !treeSnapshot) {
        return <ThreadState loading label={t('loadingThread')} />;
    }

    if (!isDraftThread && !thread) {
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
                    {visibleSnapshot ? (
                        <ThreadTimeline
                            ref={timelineRef}
                            conversation={visibleSnapshot}
                            loading={timelineLoading}
                            closed={closed}
                            connected={connected}
                            emptyLabel={t('threadEmpty')}
                            closedLabel={t('threadClosed')}
                            disconnectedLabel={t('disconnected')}
                            loadingLabel={t('loadingThread')}
                            pendingRequests={cliRuntimePendingRequests}
                            contentTopInset={contentTopInset}
                            contentBottomInset={timelineContentBottomInset}
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
                            onExpandedKeysChange={
                                isDraftThread ? updateDraftExpandedKeys : setExpandedKeys
                            }
                            onRefresh={isDraftThread ? refreshDraftThread : open}
                        />
                    ) : (
                        <ThreadState
                            loading={waitingForSnapshot}
                            label={
                                screenError ??
                                (waitingForSnapshot ? t('loadingThread') : t('disconnected'))
                            }
                            color={theme.colors.typography}
                        />
                    )}
                </View>
                {visibleSnapshot ? (
                    <KeyboardStickyView offset={keyboardStickyOffset} style={styles.composerSticky}>
                        <View ref={composerRef} onLayout={handleComposerAreaLayout}>
                            <ThreadComposer
                                value={draftText}
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
                                capabilities={cliRuntimeSelected ? [] : composerCapabilities}
                                attachmentsEnabled
                                attachmentMenuAccessibilityLabel={t('composerAttachmentMenuTitle')}
                                modelSelectionLabel={modelSelectionLabel}
                                modelSelectionEffortLabel={modelSelectionEffortLabel}
                                modelSelectionLoading={modelSelectionLoading}
                                modelSelectionAccessibilityLabel={t('modelSelectorOpen')}
                                modelSelectionDisabled={modelSelectionDisabled}
                                inputNativeID={THREAD_COMPOSER_INPUT_NATIVE_ID}
                                onChangeText={setDraftText}
                                onOpenAttachmentMenu={openAttachmentMenu}
                                onOpenModelSelector={openModelSelector}
                                onRemoveAttachment={removeAttachment}
                                onRemoveCapability={removeCapability}
                                onSend={handleSend}
                                onSteerTurn={handleSteerTurn}
                                onStopTurn={handleStopTurn}
                            />
                        </View>
                    </KeyboardStickyView>
                ) : null}
            </KeyboardGestureArea>
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

const errorMessage = (error: unknown) =>
    error instanceof Error ? error.message : 'CLI runtime operation failed.';

export default ThreadScreen;

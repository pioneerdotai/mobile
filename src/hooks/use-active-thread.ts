import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { pioneerClient, type ClientEvent, type Thread, type ThreadMode } from '@/client';
import {
    activeThreadSnapshot,
    applyActiveThreadEvent,
    cancelActiveThreadTurn,
    openActiveThread,
    sendActiveThreadText,
} from '@/services/threads/active';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useGatewayStore } from '@/stores/gateway';

let openSequence = 0;

const MODEL_SELECTION_REQUIRED_ERROR = 'model and provider must';
const DEFAULT_COMPOSER_MODE: ThreadMode = 'Agent';

const errorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
};

const isTimelineEvent = (
    event: ClientEvent | null,
): event is Extract<ClientEvent, { GatewayNotification: unknown }> => {
    if (!event || !('GatewayNotification' in event)) {
        return false;
    }

    const notification = event.GatewayNotification;

    switch (notification.kind) {
        case 'thread_started':
        case 'thread_closed':
        case 'thread_updated':
        case 'turn_started':
        case 'turn_completed':
        case 'turn_failed':
        case 'turn_blocked':
        case 'item_started':
        case 'item_delta':
        case 'item_completed':
        case 'item_updated':
        case 'item_timeout_detected':
        case 'item_recovery_opened':
        case 'item_recovery_attached':
        case 'item_retry_scheduled':
        case 'item_retry_attempt_started':
        case 'item_recovery_succeeded':
        case 'item_recovery_exhausted':
        case 'item_tool_retry_scheduled':
        case 'item_tool_retry_resolved':
        case 'item_tool_retry_exhausted':
        case 'turn_tool_loop_budget_exceeded':
        case 'turn_timeline_changed':
            return true;
        default:
            return false;
    }
};

export const useActiveThread = (
    thread: Thread | null,
    workspaceId: string | null = null,
    active = true,
) => {
    const { t } = useTranslation('threads');

    const {
        snapshot,
        loading,
        error,
        sending,
        composerError,
        composerAttachments,
        composerCapabilities,
        composerSelectedMode,
        composerSelectedProvider,
        composerSelectedModel,
        defaultComposerSelectionLoading,
        composerModelManuallySelected,
        reset,
        setSnapshot,
        setLoading,
        setError,
        setSending,
        setComposerError,
        setComposerAttachments,
        setComposerCapabilities,
        clearComposerPayload,
        setExpandedKeys,
        syncComposerMode,
    } = useActiveThreadStore(
        useShallow((state) => ({
            snapshot: state.snapshot,
            loading: state.loading,
            error: state.error,
            sending: state.sending,
            composerError: state.composerError,
            composerAttachments: state.composerAttachments,
            composerCapabilities: state.composerCapabilities,
            composerSelectedMode: state.composerSelectedMode,
            composerSelectedProvider: state.composerSelectedProvider,
            composerSelectedModel: state.composerSelectedModel,
            defaultComposerSelectionLoading: state.defaultComposerSelectionLoading,
            composerModelManuallySelected: state.composerModelManuallySelected,
            reset: state.reset,
            setSnapshot: state.setSnapshot,
            setLoading: state.setLoading,
            setError: state.setError,
            setSending: state.setSending,
            setComposerError: state.setComposerError,
            setComposerAttachments: state.setComposerAttachments,
            setComposerCapabilities: state.setComposerCapabilities,
            clearComposerPayload: state.clearComposerPayload,
            setExpandedKeys: state.setExpandedKeys,
            syncComposerMode: state.syncComposerMode,
        })),
    );

    const { connectionId, connectionState } = useGatewayStore(
        useShallow((state) => ({
            connectionId: state.connectionId,
            connectionState: state.connectionState,
        })),
    );

    const eventQueueRef = useRef(Promise.resolve());
    const activeThreadIdRef = useRef<string | null | undefined>(undefined);
    const threadRef = useRef<Thread | null>(null);
    const [turnCancelling, setTurnCancelling] = useState(false);

    const connected = connectionState === 'Connected' && connectionId !== null;
    const threadId = thread?.id ?? null;
    const threadMode = thread?.mode ?? DEFAULT_COMPOSER_MODE;
    const snapshotThreadId = snapshot?.thread_id ?? null;
    const subscribedThreadId = threadId ?? snapshotThreadId;

    useEffect(() => {
        threadRef.current = thread;
    }, [thread]);

    const open = useCallback(
        async (threadToOpen: Thread) => {
            if (!active || !connected) {
                return;
            }

            const sequence = openSequence + 1;
            openSequence = sequence;

            setLoading(true);
            setError(null);

            try {
                const nextSnapshot = await openActiveThread({
                    thread: threadToOpen,
                    expanded_keys: useActiveThreadStore.getState().expandedKeys,
                });

                if (
                    openSequence !== sequence ||
                    useGatewayStore.getState().connectionId !== connectionId
                ) {
                    return;
                }

                setSnapshot(nextSnapshot);
            } catch (caught) {
                if (
                    openSequence === sequence &&
                    useGatewayStore.getState().connectionId === connectionId
                ) {
                    setError(errorMessage(caught, t('loadFailed')));
                }
            } finally {
                if (
                    openSequence === sequence &&
                    useGatewayStore.getState().connectionId === connectionId
                ) {
                    setLoading(false);
                }
            }
        },
        [active, connected, connectionId, setError, setLoading, setSnapshot, t],
    );

    const refresh = useCallback(async () => {
        if (!active) {
            return;
        }

        const threadToOpen = threadRef.current;

        if (!threadToOpen || threadToOpen.id !== threadId) {
            return;
        }

        await open(threadToOpen);
    }, [active, open, threadId]);

    useLayoutEffect(() => {
        if (!active) {
            return;
        }

        if (activeThreadIdRef.current === threadId) {
            return;
        }

        activeThreadIdRef.current = threadId;
        reset({ threadId, mode: threadMode });
    }, [active, reset, threadId, threadMode]);

    useEffect(() => {
        if (!active) {
            return;
        }

        if (!thread || thread.id !== threadId) {
            return;
        }

        syncComposerMode(thread.id, thread.mode);
    }, [active, syncComposerMode, thread, threadId]);

    useEffect(() => {
        if (!active || !threadId || !connected) {
            return;
        }

        void refresh();
    }, [active, connected, connectionId, refresh, threadId]);

    useEffect(() => {
        if (!active || !subscribedThreadId || !connected || connectionId === null) {
            return;
        }

        return useGatewayStore.subscribe((state, previousState) => {
            if (state.lastEventSerial === previousState.lastEventSerial) {
                return;
            }

            const event = state.lastEvent;
            if (!isTimelineEvent(event)) {
                return;
            }

            eventQueueRef.current = eventQueueRef.current
                .catch(() => {})
                .then(async () => {
                    const nextSnapshot = await applyActiveThreadEvent({
                        event,
                        expanded_keys: useActiveThreadStore.getState().expandedKeys,
                    });

                    if (
                        useGatewayStore.getState().connectionId !== connectionId ||
                        activeThreadIdRef.current !== subscribedThreadId
                    ) {
                        return;
                    }

                    setSnapshot(nextSnapshot);
                })
                .catch((caught) => {
                    if (
                        useGatewayStore.getState().connectionId === connectionId &&
                        activeThreadIdRef.current === subscribedThreadId
                    ) {
                        setError(errorMessage(caught, t('loadFailed')));
                    }
                });
        });
    }, [active, connected, connectionId, setError, setSnapshot, subscribedThreadId, t]);

    const updateExpandedKeys = useCallback(
        (keys: string[]) => {
            setExpandedKeys(keys);
            setSnapshot(activeThreadSnapshot({ expanded_keys: keys }));
        },
        [setExpandedKeys, setSnapshot],
    );

    const sendText = useCallback(
        async (text: string): Promise<boolean> => {
            const normalizedText = text.trim();
            if (!active) {
                return false;
            }

            const storeState = useActiveThreadStore.getState();
            const attachments = storeState.composerAttachments;
            const capabilities = storeState.composerCapabilities;
            const hasSendableContent =
                normalizedText.length > 0 || attachments.length > 0 || capabilities.length > 0;
            if (
                (!thread && !workspaceId) ||
                !connected ||
                connectionId === null ||
                !hasSendableContent
            ) {
                return false;
            }

            const currentSnapshot = storeState.snapshot;
            if (
                storeState.composerModelManuallySelected &&
                (!storeState.composerSelectedProvider || !storeState.composerSelectedModel)
            ) {
                setComposerError(t('modelSelectionRequired'));
                return false;
            }

            const requestThreadId = thread?.id ?? currentSnapshot?.thread_id ?? null;
            const requestWorkspaceId =
                workspaceId ??
                thread?.workspace_id ??
                currentSnapshot?.thread?.workspace_id ??
                currentSnapshot?.workspace_id ??
                null;
            const requestThreadClosed =
                thread?.status === 'Closed' || currentSnapshot?.thread?.status === 'Closed';
            if (
                storeState.sending ||
                currentSnapshot?.projection.composer_locked ||
                requestThreadClosed
            ) {
                return false;
            }

            setSending(true);
            setComposerError(null);
            const attachmentsForSend =
                attachments.length > 0
                    ? pioneerClient.composerAttachmentsUpdate({
                          attachments,
                          action: 'MarkPendingUploading',
                      })
                    : attachments;
            if (attachmentsForSend !== attachments) {
                setComposerAttachments(attachmentsForSend);
            }

            try {
                const result = await sendActiveThreadText({
                    thread_id: requestThreadId,
                    workspace_id: requestWorkspaceId,
                    text,
                    selected_model: storeState.composerModelManuallySelected
                        ? storeState.composerSelectedModel
                        : null,
                    selected_provider: storeState.composerModelManuallySelected
                        ? storeState.composerSelectedProvider
                        : null,
                    selected_mode: storeState.composerSelectedMode,
                    attachments: attachmentsForSend,
                    capabilities,
                    expanded_keys: useActiveThreadStore.getState().expandedKeys,
                });

                if (
                    useGatewayStore.getState().connectionId !== connectionId ||
                    (requestThreadId && activeThreadIdRef.current !== requestThreadId)
                ) {
                    return false;
                }

                activeThreadIdRef.current = result.thread_id;
                const latestSnapshot = useActiveThreadStore.getState().snapshot;
                if (
                    !latestSnapshot ||
                    latestSnapshot.projection.revision <= result.snapshot.projection.revision
                ) {
                    setSnapshot(result.snapshot);
                }
                clearComposerPayload();
                return true;
            } catch (caught) {
                if (
                    useGatewayStore.getState().connectionId === connectionId &&
                    (!requestThreadId || activeThreadIdRef.current === requestThreadId)
                ) {
                    const message = errorMessage(caught, t('sendFailed'));
                    if (attachmentsForSend.length > 0) {
                        setComposerAttachments(
                            pioneerClient.composerAttachmentsUpdate({
                                attachments: useActiveThreadStore.getState().composerAttachments,
                                action: { MarkUploadingFailed: { error: message } },
                            }),
                        );
                    }
                    setComposerError(
                        message.includes(MODEL_SELECTION_REQUIRED_ERROR)
                            ? t('modelSelectionRequired')
                            : message,
                    );
                    try {
                        const rejectedSnapshot = activeThreadSnapshot({
                            expanded_keys: useActiveThreadStore.getState().expandedKeys,
                        });
                        if (rejectedSnapshot.thread_id) {
                            activeThreadIdRef.current = rejectedSnapshot.thread_id;
                        }
                        setSnapshot(rejectedSnapshot);
                    } catch {
                        // The native error is already surfaced through composerError.
                    }
                }
                return false;
            } finally {
                if (
                    useGatewayStore.getState().connectionId === connectionId &&
                    (!requestThreadId || activeThreadIdRef.current === requestThreadId)
                ) {
                    setSending(false);
                }
            }
        },
        [
            connected,
            connectionId,
            setComposerError,
            clearComposerPayload,
            setComposerAttachments,
            setSending,
            setSnapshot,
            t,
            workspaceId,
            thread,
            active,
        ],
    );

    const stopTurn = useCallback(async (): Promise<boolean> => {
        if (!active || !connected || connectionId === null || turnCancelling) {
            return false;
        }

        const currentSnapshot = useActiveThreadStore.getState().snapshot;
        const turnId = currentSnapshot?.projection.in_flight_turn_id;
        if (!turnId) {
            return false;
        }

        setTurnCancelling(true);
        setComposerError(null);

        try {
            const result = await cancelActiveThreadTurn({
                reason: t('stopReason'),
                expanded_keys: useActiveThreadStore.getState().expandedKeys,
            });

            if (useGatewayStore.getState().connectionId !== connectionId) {
                return false;
            }

            if (result.snapshot.thread_id) {
                activeThreadIdRef.current = result.snapshot.thread_id;
            }
            const latestSnapshot = useActiveThreadStore.getState().snapshot;
            if (
                !latestSnapshot ||
                latestSnapshot.projection.revision <= result.snapshot.projection.revision
            ) {
                setSnapshot(result.snapshot);
            }

            return result.cancelled;
        } catch (caught) {
            if (useGatewayStore.getState().connectionId === connectionId) {
                setComposerError(errorMessage(caught, t('stopFailed')));
                try {
                    const rejectedSnapshot = activeThreadSnapshot({
                        expanded_keys: useActiveThreadStore.getState().expandedKeys,
                    });
                    if (rejectedSnapshot.thread_id) {
                        activeThreadIdRef.current = rejectedSnapshot.thread_id;
                    }
                    setSnapshot(rejectedSnapshot);
                } catch {
                    // The native error is already surfaced through composerError.
                }
            }

            return false;
        } finally {
            setTurnCancelling(false);
        }
    }, [active, connected, connectionId, setComposerError, setSnapshot, t, turnCancelling]);

    const snapshotThreadClosed = snapshot?.thread?.status === 'Closed';
    const hasInFlightTurn = Boolean(snapshot?.projection.in_flight_turn_id);
    const cancellingTurn = snapshot?.projection.phase_label === 'cancelling';
    const turnActionLoading = turnCancelling || cancellingTurn;
    const canStopTurn = Boolean(active && connected && hasInFlightTurn && !turnActionLoading);

    const canSend = Boolean(
        (thread || workspaceId) &&
        active &&
        connected &&
        !sending &&
        (!composerModelManuallySelected || (composerSelectedProvider && composerSelectedModel)) &&
        !snapshot?.projection.composer_locked &&
        thread?.status !== 'Closed' &&
        !snapshotThreadClosed,
    );

    return useMemo(
        () => ({
            snapshot,
            loading,
            error,
            sending,
            turnCancelling: turnActionLoading,
            composerError,
            composerAttachments,
            composerCapabilities,
            composerSelectedMode,
            connected,
            canSend,
            hasInFlightTurn,
            canStopTurn,
            composerSelectedProvider,
            composerSelectedModel,
            defaultComposerSelectionLoading,
            composerModelManuallySelected,
            open: refresh,
            sendText,
            stopTurn,
            setComposerAttachments,
            setComposerCapabilities,
            setExpandedKeys: updateExpandedKeys,
        }),
        [
            canSend,
            canStopTurn,
            composerError,
            composerAttachments,
            composerCapabilities,
            composerModelManuallySelected,
            composerSelectedMode,
            composerSelectedModel,
            composerSelectedProvider,
            defaultComposerSelectionLoading,
            connected,
            error,
            hasInFlightTurn,
            loading,
            refresh,
            sending,
            stopTurn,
            sendText,
            setComposerAttachments,
            setComposerCapabilities,
            snapshot,
            turnActionLoading,
            updateExpandedKeys,
        ],
    );
};

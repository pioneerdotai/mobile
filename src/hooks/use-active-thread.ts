import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';

import type { Thread } from '@/client';
import {
    activeThreadSnapshot,
    applyActiveThreadEvent,
    cancelActiveThreadTurn,
    openActiveThread,
    openActiveThreadById,
    sendActiveThreadText,
} from '@/services/threads/active';
import { selectedReasoningEffortRequestFields } from '@/services/threads/reasoning-effort';
import {
    invalidateTimelineQueriesForActiveThreadEvent,
    isActiveThreadTimelineEvent,
} from '@/services/threads/live-timeline-events';
import { invalidateTimelineQueriesForThread } from '@/services/threads/timeline-query';
import { composerSubmissionPlanForProvider } from '@/services/providers/cli-runtime';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useGatewayStore } from '@/stores/gateway';

let openSequence = 0;

const MODEL_SELECTION_REQUIRED_ERROR = 'model and provider must';

const errorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
};

export const useActiveThread = (
    thread: Thread | null,
    workspaceId: string | null = null,
    active = true,
    requestedThreadId: string | null = thread?.id ?? null,
) => {
    const { t } = useTranslation('threads');
    const queryClient = useQueryClient();

    const {
        snapshot,
        loading,
        error,
        sending,
        composerText,
        composerError,
        composerAttachments,
        composerCapabilities,
        composerSelectedMode,
        composerSelectedProvider,
        composerCapabilityTarget,
        composerSelectedModel,
        composerSelectedReasoningEffort,
        composerSelectedPermissionMode,
        defaultComposerSelectionLoading,
        composerModelManuallySelected,
        activateComposerThread,
        setSnapshot,
        setLoading,
        setError,
        setSending,
        setComposerText,
        setComposerError,
        setComposerAttachments,
        setComposerCapabilities,
        markComposerAttachmentsUploading,
        markComposerAttachmentsFailed,
        clearComposerPayload,
        setExpandedKeys,
    } = useActiveThreadStore(
        useShallow((state) => ({
            snapshot: state.snapshot,
            loading: state.loading,
            error: state.error,
            sending: state.sending,
            composerText: state.composerText,
            composerError: state.composerError,
            composerAttachments: state.composerAttachments,
            composerCapabilities: state.composerCapabilities,
            composerSelectedMode: state.composerSelectedMode,
            composerSelectedProvider: state.composerSelectedProvider,
            composerCapabilityTarget: state.composerCapabilityTarget,
            composerSelectedModel: state.composerSelectedModel,
            composerSelectedReasoningEffort: state.composerSelectedReasoningEffort,
            composerSelectedPermissionMode: state.composerSelectedPermissionMode,
            defaultComposerSelectionLoading: state.defaultComposerSelectionLoading,
            composerModelManuallySelected: state.composerModelManuallySelected,
            activateComposerThread: state.activateComposerThread,
            setSnapshot: state.setSnapshot,
            setLoading: state.setLoading,
            setError: state.setError,
            setSending: state.setSending,
            setComposerText: state.setComposerText,
            setComposerError: state.setComposerError,
            setComposerAttachments: state.setComposerAttachments,
            setComposerCapabilities: state.setComposerCapabilities,
            markComposerAttachmentsUploading: state.markComposerAttachmentsUploading,
            markComposerAttachmentsFailed: state.markComposerAttachmentsFailed,
            clearComposerPayload: state.clearComposerPayload,
            setExpandedKeys: state.setExpandedKeys,
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
    const { mutateAsync: sendActiveThreadTextAsync } = useMutation({
        mutationFn: sendActiveThreadText,
    });
    const { mutateAsync: cancelActiveThreadTurnAsync } = useMutation({
        mutationFn: cancelActiveThreadTurn,
        onSuccess: (result) => {
            void invalidateTimelineQueriesForThread(queryClient, result.snapshot.thread_id);
        },
    });

    const connected = connectionState === 'Connected' && connectionId !== null;
    const threadId = requestedThreadId ?? thread?.id ?? null;
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

    const openById = useCallback(
        async (threadIdToOpen: string) => {
            if (!active || !connected) {
                return;
            }

            const sequence = openSequence + 1;
            openSequence = sequence;

            setLoading(true);
            setError(null);

            try {
                const nextSnapshot = await openActiveThreadById({
                    thread_id: threadIdToOpen,
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

        if (!threadId) {
            return;
        }

        if (threadToOpen && threadToOpen.id === threadId) {
            await open(threadToOpen);
            return;
        }

        await openById(threadId);
    }, [active, open, openById, threadId]);

    useLayoutEffect(() => {
        if (!active) {
            return;
        }

        if (!threadId || activeThreadIdRef.current === threadId) {
            return;
        }

        activeThreadIdRef.current = threadId;
        activateComposerThread(threadId);
    }, [active, activateComposerThread, threadId]);

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
            if (!isActiveThreadTimelineEvent(event)) {
                return;
            }
            eventQueueRef.current = eventQueueRef.current
                .catch(() => {})
                .then(async () => {
                    const result = await applyActiveThreadEvent({
                        event,
                        expanded_keys: useActiveThreadStore.getState().expandedKeys,
                    });

                    if (
                        useGatewayStore.getState().connectionId !== connectionId ||
                        activeThreadIdRef.current !== subscribedThreadId
                    ) {
                        return;
                    }

                    void invalidateTimelineQueriesForActiveThreadEvent(
                        queryClient,
                        event,
                        result.snapshot.thread_id,
                    );
                    setSnapshot(result.snapshot);
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
    }, [
        active,
        connected,
        connectionId,
        queryClient,
        setError,
        setSnapshot,
        subscribedThreadId,
        t,
    ]);

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
            const currentSnapshot = storeState.snapshot;
            const hasCompleteComposerModelSelection = Boolean(
                storeState.composerSelectedProvider && storeState.composerSelectedModel,
            );
            const selectedProviderForSend = hasCompleteComposerModelSelection
                ? storeState.composerSelectedProvider
                : null;
            const selectedModelForSend = hasCompleteComposerModelSelection
                ? storeState.composerSelectedModel
                : null;
            const selectedReasoningEffortForSend = hasCompleteComposerModelSelection
                ? storeState.composerSelectedReasoningEffort
                : null;
            const attachments = storeState.composerAttachments;
            const submissionPlan = composerSubmissionPlanForProvider(
                selectedProviderForSend,
                normalizedText,
                attachments.length > 0,
                storeState.composerCapabilities,
            );
            if (
                (!thread && !workspaceId) ||
                !connected ||
                connectionId === null ||
                !submissionPlan.has_composer_payload
            ) {
                return false;
            }

            if (
                storeState.composerModelManuallySelected &&
                (!storeState.composerSelectedProvider || !storeState.composerSelectedModel)
            ) {
                setComposerError(t('modelSelectionRequired'));
                return false;
            }

            const requestThreadId = threadId ?? currentSnapshot?.thread_id ?? null;
            const requestWorkspaceId =
                workspaceId ??
                thread?.workspace_id ??
                currentSnapshot?.thread?.workspace_id ??
                currentSnapshot?.workspace_id ??
                null;
            if (!requestThreadId) {
                setComposerError(t('sendFailed'));
                return false;
            }
            if (!requestWorkspaceId) {
                setComposerError(t('sendFailed'));
                return false;
            }
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
                attachments.length > 0 ? markComposerAttachmentsUploading() : attachments;

            try {
                const result = await sendActiveThreadTextAsync({
                    thread_id: requestThreadId,
                    workspace_id: requestWorkspaceId,
                    text,
                    selected_model: selectedModelForSend,
                    selected_provider: selectedProviderForSend,
                    ...selectedReasoningEffortRequestFields(selectedReasoningEffortForSend),
                    selected_mode: storeState.composerSelectedMode,
                    permission_mode: storeState.composerSelectedPermissionMode,
                    attachments: attachmentsForSend,
                    capabilities: submissionPlan.capabilities,
                    expanded_keys: useActiveThreadStore.getState().expandedKeys,
                });

                if (
                    useGatewayStore.getState().connectionId !== connectionId ||
                    activeThreadIdRef.current !== requestThreadId
                ) {
                    return false;
                }

                activeThreadIdRef.current = result.thread_id;
                void invalidateTimelineQueriesForThread(queryClient, result.thread_id);
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
                    activeThreadIdRef.current === requestThreadId
                ) {
                    const message = errorMessage(caught, t('sendFailed'));
                    if (attachmentsForSend.length > 0) {
                        markComposerAttachmentsFailed(message);
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
                    activeThreadIdRef.current === requestThreadId
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
            markComposerAttachmentsFailed,
            markComposerAttachmentsUploading,
            setSending,
            setSnapshot,
            t,
            queryClient,
            sendActiveThreadTextAsync,
            workspaceId,
            thread,
            threadId,
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
            const result = await cancelActiveThreadTurnAsync({
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
    }, [
        active,
        cancelActiveThreadTurnAsync,
        connected,
        connectionId,
        setComposerError,
        setSnapshot,
        t,
        turnCancelling,
    ]);

    const snapshotThreadClosed = snapshot?.thread?.status === 'Closed';
    const hasInFlightTurn = Boolean(snapshot?.projection.in_flight_turn_id);
    const cancellingTurn = snapshot?.projection.phase_label === 'cancelling';
    const turnActionLoading = turnCancelling || cancellingTurn;
    const canStopTurn = Boolean(active && connected && hasInFlightTurn && !turnActionLoading);

    const canSend = Boolean(
        Boolean(threadId) &&
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
            composerText,
            composerAttachments,
            composerCapabilities,
            composerSelectedMode,
            connected,
            canSend,
            hasInFlightTurn,
            canStopTurn,
            composerSelectedProvider,
            composerCapabilityTarget,
            composerSelectedModel,
            composerSelectedReasoningEffort,
            composerSelectedPermissionMode,
            defaultComposerSelectionLoading,
            composerModelManuallySelected,
            open: refresh,
            sendText,
            stopTurn,
            setComposerText,
            setComposerAttachments,
            setComposerCapabilities,
            setExpandedKeys: updateExpandedKeys,
        }),
        [
            canSend,
            canStopTurn,
            composerError,
            composerText,
            composerAttachments,
            composerCapabilities,
            composerModelManuallySelected,
            composerSelectedMode,
            composerSelectedModel,
            composerSelectedProvider,
            composerCapabilityTarget,
            composerSelectedReasoningEffort,
            composerSelectedPermissionMode,
            defaultComposerSelectionLoading,
            connected,
            error,
            hasInFlightTurn,
            loading,
            refresh,
            sending,
            stopTurn,
            sendText,
            setComposerText,
            setComposerAttachments,
            setComposerCapabilities,
            snapshot,
            turnActionLoading,
            updateExpandedKeys,
        ],
    );
};

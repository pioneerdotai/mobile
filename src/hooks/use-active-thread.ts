import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';

import type { ClientActiveThreadSnapshot, ComposerSkillPickerProjection, Thread } from '@/client';
import { withGatewayTransportLease } from '@/services/gateway/transport-coordinator';
import {
    activeThreadSnapshot,
    applyActiveThreadEvent,
    cancelActiveThreadTurn,
    openActiveThread,
    openActiveThreadById,
    sendActiveThreadText,
} from '@/services/threads/active';
import { selectedReasoningEffortRequestFields } from '@/services/threads/reasoning-effort';
import { skillSelectionRequestFields } from '@/services/threads/skill-selection-request';
import {
    invalidateTimelineQueriesForActiveThreadEvent,
    isActiveThreadTimelineEvent,
} from '@/services/threads/live-timeline-events';
import {
    cacheActiveThreadSnapshot,
    cachedActiveThreadSnapshot,
    invalidateTimelineQueriesForThread,
    invalidateTurnWorkQueries,
    newestActiveThreadSnapshot,
    timelineQueryKeys,
} from '@/services/threads/timeline-query';
import { reconcileTurnWorkItemsForEvent } from '@/services/threads/turn-work-reconciliation';
import { composerSubmissionPlanForProvider } from '@/services/providers/cli-runtime';
import { invalidateMaterializedThreadAuthorization } from '@/services/administration/query';
import { useActiveThreadSnapshotQuery } from '@/hooks/use-active-thread-snapshot-query';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useGatewayStore } from '@/stores/gateway';

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
    const threadId = requestedThreadId ?? thread?.id ?? null;
    const snapshotQuery = useActiveThreadSnapshotQuery(threadId);
    const snapshot = snapshotQuery.data ?? null;
    const loading = snapshotQuery.isFetching;
    const error = snapshotQuery.error ? errorMessage(snapshotQuery.error, t('loadFailed')) : null;

    const {
        sending,
        composerText,
        composerError,
        composerAttachments,
        composerCapabilities,
        composerSkillSelections,
        composerReplyTarget,
        composerSelectedMentions,
        composerSelectedMode,
        composerSelectedProvider,
        composerCapabilityTarget,
        composerSelectedModel,
        composerSelectedReasoningEffort,
        composerSelectedPermissionMode,
        defaultComposerSelectionLoading,
        composerModelManuallySelected,
        activateComposerThread,
        setSending,
        setComposerText,
        setComposerError,
        setComposerAttachments,
        setComposerCapabilities,
        setComposerSkillSelections,
        markComposerAttachmentsUploading,
        markComposerAttachmentsFailed,
        clearComposerPayload,
        retainComposerAfterSendFailure,
        setExpandedKeys,
    } = useActiveThreadStore(
        useShallow((state) => ({
            sending: state.sending,
            composerText: state.composerText,
            composerError: state.composerError,
            composerAttachments: state.composerAttachments,
            composerCapabilities: state.composerCapabilities,
            composerSkillSelections: state.composerSkillSelections,
            composerReplyTarget: state.composerReplyTarget,
            composerSelectedMentions: state.composerSelectedMentions,
            composerSelectedMode: state.composerSelectedMode,
            composerSelectedProvider: state.composerSelectedProvider,
            composerCapabilityTarget: state.composerCapabilityTarget,
            composerSelectedModel: state.composerSelectedModel,
            composerSelectedReasoningEffort: state.composerSelectedReasoningEffort,
            composerSelectedPermissionMode: state.composerSelectedPermissionMode,
            defaultComposerSelectionLoading: state.defaultComposerSelectionLoading,
            composerModelManuallySelected: state.composerModelManuallySelected,
            activateComposerThread: state.activateComposerThread,
            setSending: state.setSending,
            setComposerText: state.setComposerText,
            setComposerError: state.setComposerError,
            setComposerAttachments: state.setComposerAttachments,
            setComposerCapabilities: state.setComposerCapabilities,
            setComposerSkillSelections: state.setComposerSkillSelections,
            markComposerAttachmentsUploading: state.markComposerAttachmentsUploading,
            markComposerAttachmentsFailed: state.markComposerAttachmentsFailed,
            clearComposerPayload: state.clearComposerPayload,
            retainComposerAfterSendFailure: state.retainComposerAfterSendFailure,
            setExpandedKeys: state.setExpandedKeys,
        })),
    );

    const { connectionGatewayId, connectionId, connectionState } = useGatewayStore(
        useShallow((state) => ({
            connectionGatewayId: state.connectionGatewayId,
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

            await queryClient
                .fetchQuery<ClientActiveThreadSnapshot>({
                    queryKey: timelineQueryKeys.threadSnapshot(threadToOpen.id),
                    staleTime: 0,
                    queryFn: () =>
                        openActiveThread({
                            thread: threadToOpen,
                            expanded_keys: useActiveThreadStore.getState().expandedKeys,
                        }),
                    structuralSharing: (current, incoming) =>
                        newestActiveThreadSnapshot(
                            current as ClientActiveThreadSnapshot | null | undefined,
                            incoming as ClientActiveThreadSnapshot,
                        ),
                })
                .catch(() => undefined);
        },
        [active, connected, queryClient],
    );

    const openById = useCallback(
        async (threadIdToOpen: string) => {
            if (!active || !connected) {
                return;
            }

            await queryClient
                .fetchQuery<ClientActiveThreadSnapshot>({
                    queryKey: timelineQueryKeys.threadSnapshot(threadIdToOpen),
                    staleTime: 0,
                    queryFn: () =>
                        openActiveThreadById({
                            thread_id: threadIdToOpen,
                            expanded_keys: useActiveThreadStore.getState().expandedKeys,
                        }),
                    structuralSharing: (current, incoming) =>
                        newestActiveThreadSnapshot(
                            current as ClientActiveThreadSnapshot | null | undefined,
                            incoming as ClientActiveThreadSnapshot,
                        ),
                })
                .catch(() => undefined);
        },
        [active, connected, queryClient],
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

                    if (useGatewayStore.getState().connectionId !== connectionId) {
                        return;
                    }

                    void invalidateTimelineQueriesForActiveThreadEvent(
                        queryClient,
                        event,
                        result.snapshot.thread_id,
                    );
                    cacheActiveThreadSnapshot(queryClient, result.snapshot);

                    void reconcileTurnWorkItemsForEvent(queryClient, event)
                        .then((changed) => {
                            if (
                                !changed ||
                                useGatewayStore.getState().connectionId !== connectionId
                            ) {
                                return;
                            }

                            const nextSnapshot = activeThreadSnapshot({
                                expanded_keys: useActiveThreadStore.getState().expandedKeys,
                            });
                            if (nextSnapshot.thread_id) {
                                cacheActiveThreadSnapshot(queryClient, nextSnapshot);
                            }
                        })
                        .catch(() => {
                            if (
                                useGatewayStore.getState().connectionId !== connectionId ||
                                event.GatewayNotification.kind !== 'turn_work_items_changed'
                            ) {
                                return;
                            }

                            void invalidateTurnWorkQueries(
                                queryClient,
                                event.GatewayNotification.params.threadId,
                                event.GatewayNotification.params.turnId,
                            );
                        });
                })
                .catch(() => {});
        });
    }, [active, connected, connectionId, queryClient, subscribedThreadId]);

    const updateExpandedKeys = useCallback(
        (keys: string[]) => {
            setExpandedKeys(keys);
            cacheActiveThreadSnapshot(queryClient, activeThreadSnapshot({ expanded_keys: keys }));
        },
        [queryClient, setExpandedKeys],
    );

    const sendText = useCallback(
        async (text: string, skillPicker: ComposerSkillPickerProjection): Promise<boolean> => {
            const normalizedText = text.trim();
            if (!active) {
                return false;
            }

            const storeState = useActiveThreadStore.getState();
            const currentSnapshot = cachedActiveThreadSnapshot(queryClient, threadId);
            const messageMode = storeState.composerSelectedMode === 'Message';
            const hasCompleteComposerModelSelection = Boolean(
                storeState.composerSelectedProvider && storeState.composerSelectedModel,
            );
            const selectedProviderForSend =
                !messageMode && hasCompleteComposerModelSelection
                    ? storeState.composerSelectedProvider
                    : null;
            const selectedModelForSend =
                !messageMode && hasCompleteComposerModelSelection
                    ? storeState.composerSelectedModel
                    : null;
            const selectedReasoningEffortForSend =
                !messageMode && hasCompleteComposerModelSelection
                    ? storeState.composerSelectedReasoningEffort
                    : null;
            const attachments = storeState.composerAttachments;
            const submissionPlan = composerSubmissionPlanForProvider(
                selectedProviderForSend,
                normalizedText,
                attachments.length > 0,
                messageMode ? [] : storeState.composerCapabilities,
            );
            if (
                (!thread && !workspaceId) ||
                !connected ||
                connectionId === null ||
                (!submissionPlan.has_composer_payload &&
                    (messageMode || storeState.composerSkillSelections.length === 0))
            ) {
                return false;
            }

            if (
                !messageMode &&
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
            const materializingDraft = currentSnapshot?.draft_thread_id === requestThreadId;
            const requestThreadClosed =
                thread?.status === 'Closed' || currentSnapshot?.thread?.status === 'Closed';
            if (
                storeState.sending ||
                (!messageMode && currentSnapshot?.projection.composer_locked) ||
                requestThreadClosed
            ) {
                return false;
            }

            setSending(true);
            setComposerError(null);
            const attachmentsForSend =
                attachments.length > 0 ? markComposerAttachmentsUploading() : attachments;

            try {
                const result = await withGatewayTransportLease(() =>
                    sendActiveThreadTextAsync({
                        thread_id: requestThreadId,
                        workspace_id: requestWorkspaceId,
                        text,
                        selected_model: selectedModelForSend,
                        selected_provider: selectedProviderForSend,
                        ...selectedReasoningEffortRequestFields(selectedReasoningEffortForSend),
                        selected_mode: storeState.composerSelectedMode,
                        permission_mode: storeState.composerSelectedPermissionMode,
                        reply_to_turn_id: storeState.composerReplyTarget?.turn_id ?? null,
                        mentioned_principal_ids: Array.from(
                            new Set(
                                storeState.composerSelectedMentions.map(
                                    (mention) => mention.principal_id,
                                ),
                            ),
                        ),
                        attachments: attachmentsForSend,
                        capabilities: submissionPlan.capabilities,
                        ...skillSelectionRequestFields(
                            messageMode ? [] : storeState.composerSkillSelections,
                            skillPicker,
                        ),
                        expanded_keys: useActiveThreadStore.getState().expandedKeys,
                    }),
                );

                if (
                    useGatewayStore.getState().connectionId !== connectionId ||
                    activeThreadIdRef.current !== requestThreadId
                ) {
                    return false;
                }

                activeThreadIdRef.current = result.thread_id;
                void invalidateTimelineQueriesForThread(queryClient, result.thread_id);
                cacheActiveThreadSnapshot(queryClient, result.snapshot);
                if (materializingDraft && connectionGatewayId !== null) {
                    void invalidateMaterializedThreadAuthorization(
                        queryClient,
                        { gatewayId: connectionGatewayId, connectionId },
                        requestWorkspaceId,
                        result.thread_id,
                    );
                }
                clearComposerPayload();
                return true;
            } catch {
                if (
                    useGatewayStore.getState().connectionId === connectionId &&
                    activeThreadIdRef.current === requestThreadId
                ) {
                    const message = t('sendFailed');
                    retainComposerAfterSendFailure();
                    if (attachmentsForSend.length > 0) {
                        markComposerAttachmentsFailed(message);
                    }
                    setComposerError(message);
                    try {
                        const rejectedSnapshot = activeThreadSnapshot({
                            expanded_keys: useActiveThreadStore.getState().expandedKeys,
                        });
                        if (rejectedSnapshot.thread_id) {
                            activeThreadIdRef.current = rejectedSnapshot.thread_id;
                        }
                        cacheActiveThreadSnapshot(queryClient, rejectedSnapshot);
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
            connectionGatewayId,
            connectionId,
            setComposerError,
            clearComposerPayload,
            retainComposerAfterSendFailure,
            markComposerAttachmentsFailed,
            markComposerAttachmentsUploading,
            setSending,
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

        const currentSnapshot = cachedActiveThreadSnapshot(queryClient, threadId);
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
            cacheActiveThreadSnapshot(queryClient, result.snapshot);

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
                    cacheActiveThreadSnapshot(queryClient, rejectedSnapshot);
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
        queryClient,
        setComposerError,
        t,
        threadId,
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
        (composerSelectedMode === 'Message' ||
            !composerModelManuallySelected ||
            (composerSelectedProvider && composerSelectedModel)) &&
        (composerSelectedMode === 'Message' || !snapshot?.projection.composer_locked) &&
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
            composerSkillSelections,
            composerReplyTarget,
            composerSelectedMentions,
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
            setComposerSkillSelections,
            setExpandedKeys: updateExpandedKeys,
        }),
        [
            canSend,
            canStopTurn,
            composerError,
            composerText,
            composerAttachments,
            composerCapabilities,
            composerSkillSelections,
            composerReplyTarget,
            composerSelectedMentions,
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
            setComposerSkillSelections,
            snapshot,
            turnActionLoading,
            updateExpandedKeys,
        ],
    );
};

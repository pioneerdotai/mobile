import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';

import type { ClientActiveThreadSnapshot, Thread } from '@/client';
import {
    requestTurnCancellation,
    useTurnCancellationPublication,
} from '@/client/turn-cancellation';
import { mobileClientBinding } from '@/client/mobile-client-binding';
import { beginComposerOperation } from '@/client/composer';
import { withGatewayTransportLease } from '@/services/gateway/transport-coordinator';
import {
    activeThreadSnapshot,
    openActiveThread,
    openActiveThreadById,
    sendActiveThreadText,
} from '@/services/threads/active';
import {
    cacheActiveThreadSnapshot,
    cachedActiveThreadSnapshot,
    invalidateTimelineQueriesForThread,
    newestActiveThreadSnapshot,
    removeTimelineQueriesForThread,
    timelineQueryKeys,
} from '@/services/threads/timeline-query';
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
        nativeComposerError,
        dismissedTurnCancellationGeneration,
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
        setComposerText,
        setComposerError,
        setComposerAttachments,
        setComposerCapabilities,
        setComposerSkillSelections,
        setExpandedKeys,
    } = useActiveThreadStore(
        useShallow((state) => ({
            sending: state.sending,
            composerText: state.composerText,
            nativeComposerError: state.composerError,
            dismissedTurnCancellationGeneration: state.dismissedTurnCancellationGeneration,
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
            setComposerText: state.setComposerText,
            setComposerError: state.setComposerError,
            setComposerAttachments: state.setComposerAttachments,
            setComposerCapabilities: state.setComposerCapabilities,
            setComposerSkillSelections: state.setComposerSkillSelections,
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

    const activeThreadIdRef = useRef<string | null | undefined>(undefined);
    const threadRef = useRef<Thread | null>(null);
    const cancellation = useTurnCancellationPublication(threadId);
    const turnCancelling = cancellation?.state.kind === 'pending';
    const composerError =
        nativeComposerError ??
        (cancellation?.state.kind === 'failed' &&
        cancellation.identity.generation !== dismissedTurnCancellationGeneration
            ? cancellation.state.message
            : null);
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

        const store = mobileClientBinding.scope({ kind: 'thread', thread_id: subscribedThreadId });
        let revision: number | null = null;
        const receive = () => {
            const publication = store.getSnapshot();
            if (
                !publication ||
                (revision !== null && publication.revisions.scoped <= revision) ||
                useGatewayStore.getState().connectionId !== connectionId
            ) {
                return;
            }
            revision = publication.revisions.scoped;
            if (publication.payload === null) {
                removeTimelineQueriesForThread(queryClient, subscribedThreadId);
                return;
            }
            const current = activeThreadSnapshot({
                thread_id: subscribedThreadId,
                expanded_keys: useActiveThreadStore.getState().expandedKeys,
            });
            cacheActiveThreadSnapshot(queryClient, current);
        };
        const unsubscribe = store.subscribe(receive);
        receive();
        return unsubscribe;
    }, [active, connected, connectionId, queryClient, subscribedThreadId]);

    const updateExpandedKeys = useCallback(
        (keys: string[]) => {
            setExpandedKeys(keys);
            cacheActiveThreadSnapshot(queryClient, activeThreadSnapshot({ expanded_keys: keys }));
        },
        [queryClient, setExpandedKeys],
    );

    useEffect(() => {
        if (!subscribedThreadId) return;
        const store = mobileClientBinding.scope({
            kind: 'composer',
            thread_id: subscribedThreadId,
        });
        const receive = () => {
            const publication = store.getSnapshot()?.payload as
                import('@/client/generated/composer_publication').ComposerPublication | null;
            if (
                publication?.operation?.kind === 'send' &&
                publication.operation.status.kind === 'failed'
            ) {
                setComposerError(t('sendFailed'));
            }
        };
        const unsubscribe = store.subscribe(receive);
        receive();
        return unsubscribe;
    }, [subscribedThreadId, setComposerError, t]);

    const sendText = useCallback(async (): Promise<boolean> => {
        if (!active || !connected) return false;
        const currentSnapshot = cachedActiveThreadSnapshot(queryClient, threadId);
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
        const operation = beginComposerOperation(requestThreadId, 'send');
        if (!operation) return false;
        setComposerError(null);

        try {
            const result = await withGatewayTransportLease(() =>
                sendActiveThreadText({
                    operation: operation.identity,
                    workspace_id: requestWorkspaceId,
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
            return true;
        } catch {
            return false;
        }
    }, [
        connected,
        connectionGatewayId,
        connectionId,
        setComposerError,
        t,
        queryClient,
        workspaceId,
        thread,
        threadId,
        active,
    ]);

    const stopTurn = useCallback(async (): Promise<boolean> => {
        if (!active || !connected || !threadId || turnCancelling) return false;
        setComposerError(null);
        return requestTurnCancellation(threadId, t('stopReason')).outcome === 'changed';
    }, [active, connected, threadId, turnCancelling, setComposerError, t]);

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

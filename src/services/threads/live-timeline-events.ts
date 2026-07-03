import type { QueryClient } from '@tanstack/react-query';

import type { ClientActiveThreadEventResult, ClientEvent } from '@/client';

import { invalidateTimelineQueriesForThread } from './timeline-query';

export type ActiveThreadTimelineEvent = Extract<ClientEvent, { GatewayNotification: unknown }>;
type SemanticTimelineCachePatch = ClientActiveThreadEventResult['semantic_timeline_patch'];

const snakeCaseThreadId = (params: object): string | null => {
    const threadId = (params as { thread_id?: unknown }).thread_id;
    return typeof threadId === 'string' ? threadId : null;
};

export const isActiveThreadTimelineEvent = (
    event: ClientEvent | null,
): event is ActiveThreadTimelineEvent => {
    if (!event || !('GatewayNotification' in event)) {
        return false;
    }

    switch (event.GatewayNotification.kind) {
        case 'thread_started':
        case 'thread_closed':
        case 'thread_updated':
        case 'thread_timeline_blocks_changed':
        case 'turn_started':
        case 'turn_completed':
        case 'turn_failed':
        case 'turn_blocked':
        case 'turn_work_items_changed':
        case 'turn_work_state_changed':
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
            return true;
        default:
            return false;
    }
};

export const activeThreadTimelineEventNeedsQueryInvalidation = (
    event: ActiveThreadTimelineEvent,
    semanticTimelinePatch?: SemanticTimelineCachePatch | null,
): boolean => {
    switch (event.GatewayNotification.kind) {
        case 'thread_timeline_blocks_changed':
            return true;
        case 'turn_work_items_changed':
        case 'turn_work_state_changed':
        case 'turn_completed':
        case 'turn_failed':
        case 'turn_blocked':
            return !semanticTimelinePatchHasChanges(semanticTimelinePatch);
        default:
            return false;
    }
};

export const semanticTimelinePatchHasChanges = (
    patch: SemanticTimelineCachePatch | null | undefined,
): boolean => {
    return Boolean(
        (patch?.changed_blocks?.length ?? 0) > 0 ||
        (patch?.removed_block_ids?.length ?? 0) > 0 ||
        (patch?.changed_work_items?.length ?? 0) > 0 ||
        (patch?.removed_work_items?.length ?? 0) > 0,
    );
};

export const activeThreadTimelineEventThreadId = (
    event: ActiveThreadTimelineEvent,
): string | null => {
    const notification = event.GatewayNotification;

    switch (notification.kind) {
        case 'thread_started':
        case 'thread_updated':
            return notification.params.thread.id;
        case 'thread_closed':
            return notification.params.threadId;
        case 'thread_timeline_blocks_changed':
        case 'turn_work_items_changed':
        case 'turn_work_state_changed':
            return notification.params.threadId;
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
            return snakeCaseThreadId(notification.params);
        default:
            return null;
    }
};

export const invalidateTimelineQueriesForActiveThreadEvent = (
    queryClient: QueryClient,
    event: ActiveThreadTimelineEvent,
    fallbackThreadId: string | null | undefined,
    semanticTimelinePatch?: SemanticTimelineCachePatch | null,
): Promise<void> => {
    if (!activeThreadTimelineEventNeedsQueryInvalidation(event, semanticTimelinePatch)) {
        return Promise.resolve();
    }

    return invalidateTimelineQueriesForThread(
        queryClient,
        activeThreadTimelineEventThreadId(event) ?? fallbackThreadId,
    );
};

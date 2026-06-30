import type { Query, QueryClient, QueryKey } from '@tanstack/react-query';

import { PioneerClientNativeError, type TimelinePageAnchor } from '@/client';

export const TIMELINE_QUERY_STALE_TIME_MS = 2_000;
export const TIMELINE_QUERY_GC_TIME_MS = 10 * 60 * 1_000;
export const DEFAULT_THREAD_TIMELINE_PAGE_LIMIT = 12;
export const DEFAULT_TURN_WORK_PAGE_LIMIT = 30;

export const TIMELINE_FFI_ERROR_CODES = {
    cancelled: 'pioneer_timeline_cancelled',
    reconnectRequired: 'pioneer_timeline_reconnect_required',
    staleCursor: 'pioneer_timeline_stale_cursor',
    validation: 'pioneer_timeline_validation_error',
} as const;

type TimelineQueryKeyRoot = 'timeline';
type TimelinePageDirection = 'topLevel' | 'turnWork';

type TimelineQueryKeyMeta = Readonly<{
    threadId: string;
    turnId?: string;
    direction?: TimelinePageDirection;
}>;

type TimelinePageRequestMeta = Readonly<{
    anchor?: TimelinePageAnchor;
    limit?: number | null;
}>;

const timelineKeyMeta = (meta: TimelineQueryKeyMeta) => meta;

const timelinePageRequestMeta = (meta: TimelinePageRequestMeta) => meta;

export const timelineQueryKeys = {
    all: ['timeline'] as const satisfies readonly [TimelineQueryKeyRoot],
    thread: (threadId: string) =>
        [...timelineQueryKeys.all, timelineKeyMeta({ threadId })] as const,
    threadPages: (threadId: string) =>
        [
            ...timelineQueryKeys.thread(threadId),
            'pages',
            timelineKeyMeta({ threadId, direction: 'topLevel' }),
        ] as const,
    threadPagesForLimit: (threadId: string, limit: number | null) =>
        [
            ...timelineQueryKeys.threadPages(threadId),
            timelinePageRequestMeta({
                limit,
            }),
        ] as const,
    threadPage: (threadId: string, request: TimelinePageRequestMeta = {}) =>
        [
            ...timelineQueryKeys.threadPages(threadId),
            timelinePageRequestMeta({
                anchor: request.anchor,
                limit: request.limit ?? null,
            }),
        ] as const,
    turnWork: (threadId: string, turnId: string) =>
        [
            ...timelineQueryKeys.thread(threadId),
            'turnWork',
            timelineKeyMeta({ threadId, turnId }),
        ] as const,
    turnWorkPages: (threadId: string, turnId: string) =>
        [
            ...timelineQueryKeys.turnWork(threadId, turnId),
            'pages',
            timelineKeyMeta({ threadId, turnId, direction: 'turnWork' }),
        ] as const,
    turnWorkPagesForLimit: (threadId: string, turnId: string, limit: number | null) =>
        [
            ...timelineQueryKeys.turnWorkPages(threadId, turnId),
            timelinePageRequestMeta({
                limit,
            }),
        ] as const,
    turnWorkPage: (threadId: string, turnId: string, request: TimelinePageRequestMeta = {}) =>
        [
            ...timelineQueryKeys.turnWorkPages(threadId, turnId),
            timelinePageRequestMeta({
                anchor: request.anchor,
                limit: request.limit ?? null,
            }),
        ] as const,
};

export const timelineQueryRetry = (failureCount: number, error: unknown): boolean => {
    if (isTimelineCancellationError(error)) {
        return false;
    }

    if (isTimelineStaleCursorError(error) || isTimelineValidationError(error)) {
        return false;
    }

    if (isTimelineReconnectError(error)) {
        return failureCount < 3;
    }

    return failureCount < 2;
};

export const timelineQueryRetryDelay = (attemptIndex: number): number => {
    return Math.min(500 * 2 ** attemptIndex, 4_000);
};

export const installTimelineQueryDefaults = (queryClient: QueryClient) => {
    queryClient.setQueryDefaults(timelineQueryKeys.all, {
        retry: timelineQueryRetry,
        retryDelay: timelineQueryRetryDelay,
        staleTime: TIMELINE_QUERY_STALE_TIME_MS,
        gcTime: TIMELINE_QUERY_GC_TIME_MS,
        refetchOnReconnect: true,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });
};

export const cancelTimelineQueriesForThread = (
    queryClient: QueryClient,
    threadId: string,
): Promise<void> => {
    return queryClient.cancelQueries({
        predicate: (query) => timelineQueryThreadId(query) === threadId,
    });
};

export const cancelTimelineQueriesExceptThread = (
    queryClient: QueryClient,
    activeThreadId: string | null,
): Promise<void> => {
    return queryClient.cancelQueries({
        predicate: (query) => {
            const threadId = timelineQueryThreadId(query);
            return Boolean(threadId && threadId !== activeThreadId);
        },
    });
};

export const removeTimelineQueriesForThread = (
    queryClient: QueryClient,
    threadId: string,
): void => {
    queryClient.removeQueries({
        queryKey: timelineQueryKeys.thread(threadId),
    });
};

export const invalidateTimelineQueriesForThread = (
    queryClient: QueryClient,
    threadId: string | null | undefined,
): Promise<void> => {
    if (!threadId) {
        return Promise.resolve();
    }

    return queryClient.invalidateQueries({
        queryKey: timelineQueryKeys.thread(threadId),
        refetchType: 'active',
    });
};

export const invalidateThreadTimelinePages = (
    queryClient: QueryClient,
    threadId: string | null | undefined,
): Promise<void> => {
    if (!threadId) {
        return Promise.resolve();
    }

    return queryClient.invalidateQueries({
        queryKey: timelineQueryKeys.threadPages(threadId),
        refetchType: 'active',
    });
};

export const invalidateTurnWorkQueries = (
    queryClient: QueryClient,
    threadId: string | null | undefined,
    turnId: string | null | undefined,
): Promise<void> => {
    if (!threadId || !turnId) {
        return Promise.resolve();
    }

    return queryClient.invalidateQueries({
        queryKey: timelineQueryKeys.turnWork(threadId, turnId),
        refetchType: 'active',
    });
};

export const isTimelineCancellationError = (error: unknown): boolean => {
    return timelineErrorCode(error) === TIMELINE_FFI_ERROR_CODES.cancelled;
};

export const isTimelineReconnectError = (error: unknown): boolean => {
    return timelineErrorCode(error) === TIMELINE_FFI_ERROR_CODES.reconnectRequired;
};

export const isTimelineStaleCursorError = (error: unknown): boolean => {
    return timelineErrorCode(error) === TIMELINE_FFI_ERROR_CODES.staleCursor;
};

export const isTimelineValidationError = (error: unknown): boolean => {
    return timelineErrorCode(error) === TIMELINE_FFI_ERROR_CODES.validation;
};

const timelineErrorCode = (error: unknown): string | null => {
    if (error instanceof PioneerClientNativeError) {
        return error.code ?? null;
    }

    return null;
};

const timelineQueryThreadId = (query: Query): string | null => {
    return timelineQueryKeyThreadId(query.queryKey);
};

export const timelineQueryKeyThreadId = (queryKey: QueryKey): string | null => {
    if (queryKey[0] !== timelineQueryKeys.all[0]) {
        return null;
    }

    for (const part of queryKey) {
        if (isTimelineQueryKeyMeta(part)) {
            return part.threadId;
        }
    }

    return null;
};

const isTimelineQueryKeyMeta = (value: unknown): value is TimelineQueryKeyMeta => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Partial<TimelineQueryKeyMeta>;
    return typeof candidate.threadId === 'string' && candidate.threadId.length > 0;
};

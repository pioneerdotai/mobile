import { describe, expect, it, jest } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';

import type { ClientEvent } from '@/client';

import {
    activeThreadTimelineEventThreadId,
    invalidateTimelineQueriesForActiveThreadEvent,
    isActiveThreadTimelineEvent,
} from './live-timeline-events';
import { timelineQueryKeys } from './timeline-query';

jest.mock('@/client', () => ({
    PioneerClientNativeError: class PioneerClientNativeError extends Error {
        code: string | null;

        constructor(message: string, code: string | null = null) {
            super(message);
            this.code = code;
        }
    },
}));

const threadTimelineBlocksChangedEvent = (threadId: string): ClientEvent =>
    ({
        GatewayNotification: {
            kind: 'thread_timeline_blocks_changed',
            params: {
                workspaceId: 'workspace_a',
                threadId,
                changedBlockIds: ['turn:turn_a:work'],
                removedBlockIds: [],
                reason: 'live_event',
            },
        },
    }) as unknown as ClientEvent;

const turnWorkStateChangedEvent = (threadId: string): ClientEvent =>
    ({
        GatewayNotification: {
            kind: 'turn_work_state_changed',
            params: {
                workspaceId: 'workspace_a',
                threadId,
                turnId: 'turn_a',
            },
        },
    }) as unknown as ClientEvent;

describe('active thread live timeline events', () => {
    it('handles persisted timeline block change notifications in the active stream', () => {
        const event = threadTimelineBlocksChangedEvent('thread_a');

        expect(isActiveThreadTimelineEvent(event)).toBe(true);
        if (!isActiveThreadTimelineEvent(event)) {
            throw new Error('expected active thread timeline event');
        }

        expect(activeThreadTimelineEventThreadId(event)).toBe('thread_a');
    });

    it('invalidates timeline queries for stale semantic timeline notifications', async () => {
        const queryClient = new QueryClient();
        const invalidateSpy = jest
            .spyOn(queryClient, 'invalidateQueries')
            .mockResolvedValue(undefined);
        const event = threadTimelineBlocksChangedEvent('thread_a');

        if (!isActiveThreadTimelineEvent(event)) {
            throw new Error('expected active thread timeline event');
        }

        await invalidateTimelineQueriesForActiveThreadEvent(queryClient, event, null);

        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: timelineQueryKeys.thread('thread_a'),
            refetchType: 'active',
        });
    });

    it('keeps top-level block invalidation on live notifications', async () => {
        const queryClient = new QueryClient();
        const invalidateSpy = jest
            .spyOn(queryClient, 'invalidateQueries')
            .mockResolvedValue(undefined);
        const event = threadTimelineBlocksChangedEvent('thread_a');

        if (!isActiveThreadTimelineEvent(event)) {
            throw new Error('expected active thread timeline event');
        }

        await invalidateTimelineQueriesForActiveThreadEvent(queryClient, event, null);

        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: timelineQueryKeys.thread('thread_a'),
            refetchType: 'active',
        });
    });

    it('invalidates work-state events through canonical timeline queries', async () => {
        const queryClient = new QueryClient();
        const invalidateSpy = jest
            .spyOn(queryClient, 'invalidateQueries')
            .mockResolvedValue(undefined);
        const event = turnWorkStateChangedEvent('thread_a');

        if (!isActiveThreadTimelineEvent(event)) {
            throw new Error('expected active thread timeline event');
        }

        await invalidateTimelineQueriesForActiveThreadEvent(queryClient, event, null);

        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: timelineQueryKeys.thread('thread_a'),
            refetchType: 'active',
        });
    });
});

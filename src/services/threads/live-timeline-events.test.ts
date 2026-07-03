import { describe, expect, it, jest } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';

import type { ClientEvent } from '@/client';

import {
    activeThreadTimelineEventThreadId,
    invalidateTimelineQueriesForActiveThreadEvent,
    isActiveThreadTimelineEvent,
    semanticTimelinePatchHasChanges,
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

    it('keeps top-level block invalidation even when the live patch updated cache', async () => {
        const queryClient = new QueryClient();
        const invalidateSpy = jest
            .spyOn(queryClient, 'invalidateQueries')
            .mockResolvedValue(undefined);
        const event = threadTimelineBlocksChangedEvent('thread_a');

        if (!isActiveThreadTimelineEvent(event)) {
            throw new Error('expected active thread timeline event');
        }

        await invalidateTimelineQueriesForActiveThreadEvent(queryClient, event, null, {
            workspace_id: 'workspace_a',
            thread_id: 'thread_a',
            changed_blocks: [
                {
                    workspaceId: 'workspace_a',
                    threadId: 'thread_a',
                    blockId: 'block_a',
                    sortKey: '001',
                    kind: {
                        kind: 'turn_state',
                        state: 'running',
                    },
                },
            ],
        });

        expect(
            semanticTimelinePatchHasChanges({
                workspace_id: 'workspace_a',
                thread_id: 'thread_a',
                changed_blocks: [],
            }),
        ).toBe(false);
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: timelineQueryKeys.thread('thread_a'),
            refetchType: 'active',
        });
    });

    it('does not invalidate work-state events when the live patch already updated the cache', async () => {
        const queryClient = new QueryClient();
        const invalidateSpy = jest
            .spyOn(queryClient, 'invalidateQueries')
            .mockResolvedValue(undefined);
        const event = turnWorkStateChangedEvent('thread_a');

        if (!isActiveThreadTimelineEvent(event)) {
            throw new Error('expected active thread timeline event');
        }

        await invalidateTimelineQueriesForActiveThreadEvent(queryClient, event, null, {
            workspace_id: 'workspace_a',
            thread_id: 'thread_a',
            changed_blocks: [
                {
                    workspaceId: 'workspace_a',
                    threadId: 'thread_a',
                    blockId: 'block_work',
                    turnId: 'turn_a',
                    sortKey: '001',
                    kind: {
                        kind: 'turn_work',
                        work: {
                            turnId: 'turn_a',
                            presentation: 'expanded_live',
                            state: 'running',
                            workCount: 1,
                            visibleWorkCount: 1,
                            hiddenWorkCount: 0,
                            hasMoreBefore: false,
                            hasMoreAfter: false,
                        },
                    },
                },
            ],
        });

        expect(invalidateSpy).not.toHaveBeenCalled();
    });
});

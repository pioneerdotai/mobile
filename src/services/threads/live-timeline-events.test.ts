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

const cliPermissionEvent = (
    kind: 'cli_runtime_request_opened' | 'cli_runtime_request_resolved',
    threadId: string,
): ClientEvent =>
    ({
        GatewayNotification: {
            kind,
            params: {
                workspace_id: 'workspace_a',
                runtime_id: 'codex',
                request_id: 'request_a',
                thread_id: threadId,
                turn_id: 'turn_a',
                ...(kind === 'cli_runtime_request_opened'
                    ? {
                          request: {
                              kind: 'command_approval',
                              title: 'Approve command',
                          },
                      }
                    : { resolution: 'approved' }),
            },
        },
    }) as unknown as ClientEvent;

const nativePermissionEvent = (
    kind: 'turn_permission_request_opened' | 'turn_permission_request_resolved',
    threadId: string,
): ClientEvent =>
    ({
        GatewayNotification: {
            kind,
            params:
                kind === 'turn_permission_request_opened'
                    ? {
                          request: {
                              request_id: 'request_a',
                              workspace_id: 'workspace_a',
                              thread_id: threadId,
                              turn_id: 'turn_a',
                              tool_name: 'exec_command',
                              action: 'shell_command',
                              scope_hash: 'scope_a',
                              reason: 'policy_requires_approval',
                          },
                      }
                    : {
                          request_id: 'request_a',
                          workspace_id: 'workspace_a',
                          thread_id: threadId,
                          turn_id: 'turn_a',
                          resolution: 'allow_once',
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
            queryKey: timelineQueryKeys.threadPages('thread_a'),
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
            queryKey: timelineQueryKeys.threadPages('thread_a'),
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
            queryKey: timelineQueryKeys.threadPages('thread_a'),
            refetchType: 'active',
        });
    });

    it.each([
        cliPermissionEvent('cli_runtime_request_opened', 'thread_cli'),
        cliPermissionEvent('cli_runtime_request_resolved', 'thread_cli'),
        nativePermissionEvent('turn_permission_request_opened', 'thread_native'),
        nativePermissionEvent('turn_permission_request_resolved', 'thread_native'),
    ])('routes live permission lifecycle events into the active-thread reducer', (event) => {
        expect(isActiveThreadTimelineEvent(event)).toBe(true);
        if (!isActiveThreadTimelineEvent(event)) {
            throw new Error('expected live permission event');
        }

        expect(activeThreadTimelineEventThreadId(event)).toBe(
            event.GatewayNotification.kind.startsWith('cli_') ? 'thread_cli' : 'thread_native',
        );
    });
});

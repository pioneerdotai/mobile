import { describe, expect, it, jest } from '@jest/globals';

import type { ClientEvent, ClientThreadTreeSnapshot, ThreadReadResponse } from '@/client';

import {
    applyThreadReadResponse,
    threadTreeInvalidationWorkspaceId,
    threadUnreadById,
} from './tree';

jest.mock('@/client', () => ({
    pioneerClient: {},
}));

describe('thread tree collaboration invalidations', () => {
    it('treats a read-cursor event as a scoped authoritative unread refetch hint', () => {
        const event = {
            GatewayNotification: {
                kind: 'thread_read_cursor_changed',
                params: {
                    workspace_id: 'workspace_a',
                    thread_id: 'thread_a',
                    cursor: {
                        through_turn_id: 'turn_a',
                        sort_key: '0001',
                    },
                    unread_count: 0,
                },
            },
        } as ClientEvent;

        expect(threadTreeInvalidationWorkspaceId(event)).toBe('workspace_a');
    });

    it('projects only authoritative unread for threads still in the snapshot', () => {
        const snapshot = {
            workspace_id: 'workspace_a',
            threads_by_id: { thread_a: { id: 'thread_a' } },
            unread: [
                { thread_id: 'thread_a', unread_count: 4 },
                { thread_id: 'removed', unread_count: 9 },
                { thread_id: 'thread_zero', unread_count: 0 },
            ],
        } as unknown as ClientThreadTreeSnapshot;

        expect(threadUnreadById(snapshot)).toEqual({ thread_a: 4 });
    });

    it('applies the authoritative read response without synthesizing other counts', () => {
        const snapshot = {
            workspace_id: 'workspace_a',
            threads_by_id: { thread_a: { id: 'thread_a' }, thread_b: { id: 'thread_b' } },
            unread: [
                { thread_id: 'thread_a', unread_count: 4 },
                { thread_id: 'thread_b', unread_count: 2 },
            ],
        } as unknown as ClientThreadTreeSnapshot;
        const response = {
            workspace_id: 'workspace_a',
            thread_id: 'thread_a',
            unread_count: 0,
            cursor: { sort_key: '2', through_turn_id: 'turn_2' },
        } as ThreadReadResponse;

        expect(applyThreadReadResponse(snapshot, response).unread).toEqual([
            { thread_id: 'thread_b', unread_count: 2 },
        ]);
    });
});

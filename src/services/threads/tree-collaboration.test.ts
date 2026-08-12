import { describe, expect, it, jest } from '@jest/globals';

import type { ClientEvent, ClientThreadTreeSnapshot, ThreadReadResponse } from '@/client';

import {
    applyThreadUpdatedToTreeSnapshot,
    applyThreadReadResponse,
    removeThreadFromTreeSnapshot,
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

    it('does not turn a targeted thread update into a full-tree invalidation', () => {
        const event = {
            GatewayNotification: {
                kind: 'thread_updated',
                params: {
                    thread: { id: 'thread_a', workspace_id: 'workspace_a' },
                    placement: {
                        thread_id: 'thread_a',
                        workspace_id: 'workspace_a',
                        folder_id: null,
                    },
                },
            },
        } as ClientEvent;

        expect(threadTreeInvalidationWorkspaceId(event)).toBeNull();
    });

    it('does not invalidate the thread tree for ordinary message lifecycle events', () => {
        const events = ['turn_started', 'thread_timeline_blocks_changed'] as const;

        for (const kind of events) {
            const event = {
                GatewayNotification: {
                    kind,
                    params: {
                        workspace_id: 'workspace_a',
                        thread_id: 'thread_a',
                    },
                },
            } as unknown as ClientEvent;

            expect(threadTreeInvalidationWorkspaceId(event)).toBeNull();
        }
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

    it('patches one updated thread without invalidating the whole tree', () => {
        const snapshot = {
            workspace_id: 'workspace_a',
            threads_by_id: {
                thread_a: { id: 'thread_a', updated_at: 1 },
                thread_b: { id: 'thread_b', updated_at: 2 },
            },
            placements_by_thread_id: {
                thread_a: {
                    thread_id: 'thread_a',
                    workspace_id: 'workspace_a',
                    folder_id: null,
                },
                thread_b: {
                    thread_id: 'thread_b',
                    workspace_id: 'workspace_a',
                    folder_id: null,
                },
            },
            thread_ids_by_folder_id: { __root__: ['thread_b', 'thread_a'] },
            folders_by_id: {},
            unread: [{ thread_id: 'thread_a', unread_count: 4 }],
        } as unknown as ClientThreadTreeSnapshot;

        const updated = applyThreadUpdatedToTreeSnapshot(
            snapshot,
            {
                ...snapshot.threads_by_id.thread_a,
                workspace_id: 'workspace_a',
                visibility: 'workspace',
                updated_at: 3,
            } as never,
            snapshot.placements_by_thread_id.thread_a,
        );

        expect(updated.threads_by_id.thread_a.visibility).toBe('workspace');
        expect(updated.threads_by_id.thread_b).toBe(snapshot.threads_by_id.thread_b);
        expect(updated.thread_ids_by_folder_id.__root__).toEqual(['thread_a', 'thread_b']);
        expect(updated.unread).toEqual([{ thread_id: 'thread_a', unread_count: 4 }]);
    });

    it('removes only the thread whose access was lost', () => {
        const snapshot = {
            workspace_id: 'workspace_a',
            threads_by_id: {
                removed: { id: 'removed' },
                kept: { id: 'kept' },
            },
            placements_by_thread_id: {},
            thread_ids_by_folder_id: { __root__: ['removed', 'kept'] },
            unread: [{ thread_id: 'removed', unread_count: 2 }],
        } as unknown as ClientThreadTreeSnapshot;

        const updated = removeThreadFromTreeSnapshot(snapshot, 'removed');

        expect(updated.threads_by_id).toEqual({ kept: { id: 'kept' } });
        expect(updated.thread_ids_by_folder_id.__root__).toEqual(['kept']);
        expect(updated.unread).toEqual([]);
    });
});

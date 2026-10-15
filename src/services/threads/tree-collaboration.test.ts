import { describe, expect, it, jest } from '@jest/globals';
import type { ClientThreadTreeSnapshot } from '@/client';
import { pioneerClient } from '@/client';
import { threadUnreadById, threadTreeLevel } from './tree';

jest.mock('@/client', () => ({ pioneerClient: { threadTreeLevel: jest.fn() } }));
jest.mock('@/client/workspaces', () => ({ drainWorkspacePublications: jest.fn() }));

describe('immutable Client tree selectors', () => {
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

    it('delegates folder ordering and membership to the typed Client projection', () => {
        const snapshot = { workspace_id: 'workspace_a' } as ClientThreadTreeSnapshot;
        const level = { folders: [], threads: [] } as never;
        jest.mocked(pioneerClient.threadTreeLevel).mockReturnValue(level);
        expect(threadTreeLevel(snapshot, 'folder-a')).toBe(level);
        expect(pioneerClient.threadTreeLevel).toHaveBeenCalledWith({
            snapshot,
            folder_id: 'folder-a',
        });
    });
});

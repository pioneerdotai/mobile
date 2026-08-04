import { describe, expect, it, jest } from '@jest/globals';

import type { ClientEvent } from '@/client';

import { threadTreeInvalidationWorkspaceId } from './tree';

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
});

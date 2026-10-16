import React from 'react';
import { afterEach, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import type { ClientThreadTreeSnapshot } from '@/client';
import { useThreadTreeLevel } from './use-thread-tree';

let mockWorkspace = 'a';
let mockSnapshot = {
    workspace_id: 'a',
    unread_by_folder_id: { parent: 9, child: 7 },
    running_task_thread_ids: ['t'],
    running_task_folder_ids: ['parent', 'child'],
} as unknown as ClientThreadTreeSnapshot;
jest.mock('@/stores/thread-tree', () => ({
    useThreadTreeStore: (select: (state: object) => unknown) =>
        select({
            snapshot: mockSnapshot,
            workspaceId: mockSnapshot.workspace_id,
            loading: false,
            error: null,
        }),
}));
jest.mock('@/stores/workspace', () => ({
    useWorkspaceStore: (select: (state: object) => unknown) =>
        select({ activeWorkspaceId: mockWorkspace }),
}));
jest.mock('@/stores/active-thread', () => ({ useActiveThreadStore: {} }));
jest.mock('@/stores/gateway', () => ({ useGatewayStore: {} }));
jest.mock('@/services/telemetry/mobile-startup', () => ({ mobileStartup: {} }));
jest.mock('@/services/threads/tree', () => ({
    refreshThreadTree: jest.fn(),
    threadUnreadById: () => ({}),
    threadTreeLevel: (_snapshot: unknown, id: string | null) => ({
        folder_id: id,
        folder: null,
        parent_folder_id: null,
        folder_path: [],
        agents_doc_summary: null,
        folders: [],
        threads: [],
    }),
}));
let tree: ReactTestRenderer | null = null;
afterEach(() => {
    act(() => tree?.unmount());
    tree = null;
});

it('exposes authoritative folder totals at every level and updates without re-entering the screen', () => {
    let level: ReturnType<typeof useThreadTreeLevel>;
    const Probe = ({ folderId }: { folderId: string | null }) => {
        level = useThreadTreeLevel(folderId);
        return null;
    };
    act(() => {
        tree = renderer.create(<Probe folderId={null} />);
    });
    expect(level!.unreadByFolderId).toBe(mockSnapshot.unread_by_folder_id);
    expect(level!.runningTaskThreadIds).toBe(mockSnapshot.running_task_thread_ids);
    expect(level!.runningTaskFolderIds).toBe(mockSnapshot.running_task_folder_ids);
    act(() => {
        tree!.update(<Probe folderId="parent" />);
    });
    expect(level!.unreadByFolderId.child).toBe(7);
    expect(level!.runningTaskFolderIds).toEqual(['parent', 'child']);
    mockSnapshot = {
        ...mockSnapshot,
        unread_by_folder_id: { parent: 0, child: 0 },
        running_task_thread_ids: [],
        running_task_folder_ids: [],
    };
    act(() => {
        tree!.update(<Probe folderId="parent" />);
    });
    expect(level!.unreadByFolderId).toEqual({ parent: 0, child: 0 });
    expect(level!.runningTaskFolderIds).toEqual([]);
    mockSnapshot = {
        ...mockSnapshot,
        running_task_thread_ids: ['t'],
        running_task_folder_ids: ['parent'],
    };
    mockWorkspace = 'b';
    act(() => {
        tree!.update(<Probe folderId={null} />);
    });
    expect(level!.unreadByFolderId).toEqual({});
    expect(level!.runningTaskThreadIds).toEqual([]);
    expect(level!.runningTaskFolderIds).toEqual([]);
});

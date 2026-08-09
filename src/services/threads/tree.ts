import { pioneerClient } from '@/client';
import type {
    ClientEvent,
    ClientThreadTreeLevel,
    ClientThreadTreeQueryData,
    ClientThreadTreeSnapshot,
    Thread,
    ThreadReadResponse,
    ThreadTreeRefreshRequest,
} from '@/client';

export const threadUnreadById = (
    snapshot: ClientThreadTreeSnapshot | null,
): Readonly<Record<string, number>> => {
    if (!snapshot) return {};

    const unread: Record<string, number> = {};
    for (const summary of snapshot.unread) {
        if (summary.unread_count > 0 && snapshot.threads_by_id[summary.thread_id]) {
            unread[summary.thread_id] = summary.unread_count;
        }
    }
    return unread;
};

export const applyThreadReadResponse = (
    snapshot: ClientThreadTreeSnapshot,
    response: ThreadReadResponse,
): ClientThreadTreeSnapshot => {
    if (
        snapshot.workspace_id !== response.workspace_id ||
        !snapshot.threads_by_id[response.thread_id]
    ) {
        return snapshot;
    }

    const unread = snapshot.unread.filter((entry) => entry.thread_id !== response.thread_id);
    if (response.unread_count > 0) {
        unread.push({
            thread_id: response.thread_id,
            unread_count: response.unread_count,
        });
    }

    return { ...snapshot, unread };
};

export const threadTreeInvalidationWorkspaceId = (event: ClientEvent | null): string | null => {
    if (!event || !('GatewayNotification' in event)) {
        return null;
    }

    const notification = event.GatewayNotification;
    switch (notification.kind) {
        case 'workspace_changed':
            return notification.params.workspace.id;
        case 'thread_tree_changed':
        case 'thread_agents_doc_changed':
        case 'thread_read_cursor_changed':
            return notification.params.workspace_id;
        case 'thread_started':
        case 'thread_updated':
            return notification.params.thread.workspace_id;
        case 'thread_closed':
            return notification.params.workspaceId;
        default:
            return null;
    }
};

export const refreshThreadTree = async (
    request: ThreadTreeRefreshRequest,
): Promise<ClientThreadTreeQueryData> => {
    return pioneerClient.threadTreeRefresh(request);
};

export const threadTreeLevel = (
    snapshot: ClientThreadTreeSnapshot,
    folderId: string | null,
): ClientThreadTreeLevel => {
    return pioneerClient.threadTreeLevel({
        snapshot,
        folder_id: folderId,
    });
};

export const threadTitle = (thread: Thread, fallback: string): string => {
    return thread.name?.trim() || thread.preview.trim() || fallback;
};

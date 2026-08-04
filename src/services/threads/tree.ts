import { pioneerClient } from '@/client';
import type {
    ClientEvent,
    ClientThreadTreeLevel,
    ClientThreadTreeQueryData,
    ClientThreadTreeSnapshot,
    Thread,
    ThreadTreeRefreshRequest,
} from '@/client';

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

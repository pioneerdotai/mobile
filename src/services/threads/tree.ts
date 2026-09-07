import { pioneerClient } from '@/client';
import { drainWorkspacePublications } from '@/client/workspaces';
import type {
    ClientThreadTreeLevel,
    ClientThreadTreeQueryData,
    ClientThreadTreeSnapshot,
    Thread,
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

export const refreshThreadTree = async (
    request: ThreadTreeRefreshRequest,
): Promise<ClientThreadTreeQueryData> => {
    try {
        return await pioneerClient.threadTreeRefresh(request);
    } finally {
        drainWorkspacePublications(request.workspace_id);
    }
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

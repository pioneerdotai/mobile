import { pioneerClient } from '@/client';
import type {
    ClientEvent,
    ClientThreadTreeLevel,
    ClientThreadTreeQueryData,
    ClientThreadTreeSnapshot,
    Thread,
    ThreadPlacement,
    ThreadReadResponse,
    ThreadTreeRefreshRequest,
} from '@/client';

const THREAD_TREE_ROOT_FOLDER_KEY = '__root__';

const withoutThread = (
    snapshot: ClientThreadTreeSnapshot,
    threadId: string,
    removeUnread: boolean,
): ClientThreadTreeSnapshot => {
    const threadsById = { ...snapshot.threads_by_id };
    const placementsByThreadId = { ...snapshot.placements_by_thread_id };
    delete threadsById[threadId];
    delete placementsByThreadId[threadId];

    return {
        ...snapshot,
        threads_by_id: threadsById,
        placements_by_thread_id: placementsByThreadId,
        thread_ids_by_folder_id: Object.fromEntries(
            Object.entries(snapshot.thread_ids_by_folder_id).map(([folderId, threadIds]) => [
                folderId,
                threadIds.filter((candidate) => candidate !== threadId),
            ]),
        ),
        unread: removeUnread
            ? snapshot.unread.filter((entry) => entry.thread_id !== threadId)
            : snapshot.unread,
    };
};

export const removeThreadFromTreeSnapshot = (
    snapshot: ClientThreadTreeSnapshot,
    threadId: string,
): ClientThreadTreeSnapshot => withoutThread(snapshot, threadId, true);

export const applyThreadUpdatedToTreeSnapshot = (
    snapshot: ClientThreadTreeSnapshot,
    thread: Thread,
    placement: ThreadPlacement | null | undefined,
): ClientThreadTreeSnapshot => {
    if (snapshot.workspace_id !== thread.workspace_id) return snapshot;

    const withoutPrevious = withoutThread(
        snapshot,
        thread.id,
        thread.sidebar_visibility === 'hidden',
    );
    if (thread.sidebar_visibility === 'hidden') return withoutPrevious;

    const nextPlacement = placement ??
        snapshot.placements_by_thread_id[thread.id] ?? {
            thread_id: thread.id,
            workspace_id: thread.workspace_id,
            folder_id: null,
        };
    const folderKey =
        nextPlacement.folder_id && withoutPrevious.folders_by_id[nextPlacement.folder_id]
            ? nextPlacement.folder_id
            : THREAD_TREE_ROOT_FOLDER_KEY;
    const threadsById = { ...withoutPrevious.threads_by_id, [thread.id]: thread };
    const folderThreadIds = [
        ...(withoutPrevious.thread_ids_by_folder_id[folderKey] ?? []),
        thread.id,
    ].sort((leftId, rightId) => {
        const left = threadsById[leftId];
        const right = threadsById[rightId];
        return (right?.updated_at ?? 0) - (left?.updated_at ?? 0) || leftId.localeCompare(rightId);
    });

    return {
        ...withoutPrevious,
        threads_by_id: threadsById,
        placements_by_thread_id: {
            ...withoutPrevious.placements_by_thread_id,
            [thread.id]: nextPlacement,
        },
        thread_ids_by_folder_id: {
            ...withoutPrevious.thread_ids_by_folder_id,
            [folderKey]: folderThreadIds,
        },
    };
};

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

import { pioneerClient } from '@/client';
import type {
    ClientThreadTreeLevel,
    ClientThreadTreeQueryData,
    ClientThreadTreeSnapshot,
    Thread,
    ThreadTreeRefreshRequest,
} from '@/client';

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

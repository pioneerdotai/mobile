import { skipToken, useQuery } from '@tanstack/react-query';

import type { ClientActiveThreadSnapshot } from '@/client';
import { timelineQueryKeys } from '@/services/threads/timeline-query';

const INACTIVE_THREAD_ID = '__inactive_thread_snapshot__';

export const useActiveThreadSnapshotQuery = (threadId: string | null) => {
    return useQuery<ClientActiveThreadSnapshot, Error>({
        queryKey: timelineQueryKeys.threadSnapshot(threadId ?? INACTIVE_THREAD_ID),
        queryFn: skipToken,
    });
};
